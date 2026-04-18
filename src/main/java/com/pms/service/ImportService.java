package com.pms.service;

import com.pms.entity.Project;
import com.pms.entity.ProjectPhaseGate;
import com.pms.entity.Task;
import com.pms.repository.ProjectPhaseGateRepository;
import com.pms.repository.ProjectRepository;
import com.pms.repository.TaskRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.time.LocalDateTime;
import java.util.*;

/**
 * WBS Import Service — matches WBSImportSample.xlsx structure.
 *
 * Actual Excel column layout (detected from header row):
 *   A: 任務            – Activity/Task name
 *   B: WBS_ID          – 0=Project, 1/2/3…=Phase, 1.1/1.2…=Task (or blank = task)
 *   C: Predecessors    – e.g. "1", "2,3"
 *   D: ActivityType    – "Project" | "Phase" | "Task"
 *   E: ScheduleStartDate
 *   F: ScheduleEndDate
 *   G: Owner           – employee ID / username
 *   H: 部門            – Department (optional)
 *
 * Import rules:
 *  - Target project MUST be empty (no existing phases or tasks)
 *  - Header row is auto-detected by scanning for "WBS" keyword
 *  - Rows with ActivityType="Project" update the project's dates (if blank)
 *  - Rows with ActivityType="Phase" create ProjectPhaseGate records
 *  - Rows with ActivityType="Task" (or blank ActivityType) create Task records
 *    linked to the previous Phase
 *  - Phase and Project dates are rolled up from child tasks if left blank
 */
@Service
public class ImportService {

    @Autowired private ProjectRepository projectRepository;
    @Autowired private ProjectPhaseGateRepository phaseRepository;
    @Autowired private TaskRepository taskRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // Main import entry point
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> importWbs(Long projectId, MultipartFile file) {

        // 1. Validate project exists
        @SuppressWarnings("null")
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Project not found: " + projectId));

        // 2. Ensure project is empty (no phases or tasks)
        List<ProjectPhaseGate> existingPhases =
                phaseRepository.findByProjectId(projectId);
        List<Task> existingTasks =
                taskRepository.findByProjectIdOrderByDisplayOrderAsc(projectId);

        if (!existingPhases.isEmpty() || !existingTasks.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Project must be empty to import a WBS structure. " +
                    "It already has " + existingPhases.size() + " phase(s) and " +
                    existingTasks.size() + " task(s). " +
                    "Please create a new project or clear the existing data first.");
        }

        // 3. Parse Excel rows
        System.out.println("Processing Excel import for project ID: " + projectId);
        List<Map<String, String>> rows = parseExcel(file);
        System.out.println("Parsed " + rows.size() + " raw rows from Excel.");

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "The Excel file contains no usable data rows.");
        }

        // 4. PRE-PASS: Identify and create all Phases first
        Map<String, ProjectPhaseGate> phaseMap = new HashMap<>(); // WBS_ID (leading int) -> Phase
        List<String> importLogs = new ArrayList<>();
        int phasesCreated = 0;
        int phaseOrder = 1;

        for (Map<String, String> row : rows) {
            String actRaw       = row.getOrDefault("activitytype", "").trim();
            String activityType = actRaw.toLowerCase();
            String wbsId        = row.getOrDefault("wbsid", "").trim();
            String name         = row.getOrDefault("name", "").trim();
            String start        = nvl(row.get("schedulestartdate"));
            String end          = nvl(row.get("scheduleenddate"));
            String role         = nvl(row.get("responsiblerole"));

            if (name.isBlank()) continue;

            boolean isPhase = activityType.equals("phase") || 
                             (actRaw.isBlank() && wbsId.matches("^\\d+(\\.0)?$") && !wbsId.equals("0"));

            if (isPhase) {
                ProjectPhaseGate phase = new ProjectPhaseGate();
                phase.setProjectId(projectId);
                phase.setPhaseName(name);
                phase.setPlannedStartDate(start);
                phase.setPlannedEndDate(end);
                phase.setResponsibleRoles(role);
                phase.setDisplayOrder(phaseOrder++);
                phase = phaseRepository.save(phase);
                
                String key = extractLeadingInt(wbsId);
                phaseMap.put(key, phase);
                phasesCreated++;
                String msg = "[Pass 1] Created Phase: " + name + " (ID: " + key + ")";
                System.out.println(msg);
                importLogs.add(msg);
            }
        }

        // 5. MAIN PASS: Process Tasks and Project dates
        int tasksCreated  = 0;
        int taskOrder     = 1;
        String projectMinStart = null;
        String projectMaxEnd   = null;
        Map<Long, List<String>> phaseTaskStarts = new LinkedHashMap<>();
        Map<Long, List<String>> phaseTaskEnds   = new LinkedHashMap<>();

        // Initialise roll-up lists for all created phases
        for (ProjectPhaseGate ph : phaseMap.values()) {
            phaseTaskStarts.put(ph.getId(), new ArrayList<>());
            phaseTaskEnds.put(ph.getId(), new ArrayList<>());
        }

        for (Map<String, String> row : rows) {
            String actRaw       = row.getOrDefault("activitytype", "").trim();
            String activityType = actRaw.toLowerCase();
            String wbsId        = row.getOrDefault("wbsid", "").trim();
            String name         = row.getOrDefault("name", "").trim();
            String start        = nvl(row.get("schedulestartdate"));
            String end          = nvl(row.get("scheduleenddate"));
            String role         = nvl(row.get("responsiblerole"));

            if (name.isBlank()) continue;

            boolean isProject = activityType.equals("project") || (actRaw.isBlank() && wbsId.equals("0"));
            boolean isPhase = phaseMap.containsKey(extractLeadingInt(wbsId)) && !wbsId.contains(".");

            if (isProject) {
                System.out.println("[Pass 2] Project Row: " + name);
                boolean updated = false;
                if (start != null && blankOrNull(project.getPlannedStartDate())) {
                    project.setPlannedStartDate(start);
                    updated = true;
                }
                if (end   != null && blankOrNull(project.getPlannedEndDate())) {
                    project.setPlannedEndDate(end);
                    updated = true;
                }
                if (updated) {
                    @SuppressWarnings({"null", "unused"})
                    Project _unused = projectRepository.save(project);
                }
                importLogs.add("[Pass 2] Handled Project row: " + name);
            } else if (!isPhase) {
                // Treated as Task
                Task task = new Task();
                task.setProjectId(projectId);
                task.setTitle(name);
                task.setPlannedStartDate(start);
                task.setPlannedEndDate(end);
                task.setResponsibleRoles(role);
                task.setPredecessors(nvl(row.get("predecessors")));
                task.setDisplayOrder(taskOrder++);
                task.setCreatedAt(LocalDateTime.now());

                // Find parent phase by extracting leading integer (e.g. "6.1.1" -> "6")
                String phaseKey = extractLeadingInt(wbsId);
                ProjectPhaseGate parentPhase = (phaseKey != null) ? phaseMap.get(phaseKey) : null;

                if (parentPhase != null) {
                    @SuppressWarnings("null")
                    final String pName = parentPhase.getPhaseName();
                    task.setPhase(pName);
                    if (start != null) phaseTaskStarts.get(parentPhase.getId()).add(start);
                    if (end   != null) phaseTaskEnds.get(parentPhase.getId()).add(end);
                    String msg = "[Pass 2] Linked Task '" + name + "' (WBS: " + wbsId + ") to Phase: " + parentPhase.getPhaseName();
                    System.out.println(msg);
                    importLogs.add(msg);
                } else {
                    String msg = "[Pass 2] Warning: Task '" + name + "' (WBS: " + wbsId + ") has no valid phase prefix.";
                    System.out.println(msg);
                    importLogs.add(msg);
                }

                taskRepository.save(task);
                tasksCreated++;

                if (start != null) projectMinStart = minDate(projectMinStart, start);
                if (end   != null) projectMaxEnd   = maxDate(projectMaxEnd, end);
            }
        }

        // 5. Phase date roll-up (fill blank phase dates from child tasks)
        List<ProjectPhaseGate> savedPhases = phaseRepository.findByProjectId(projectId);
        for (ProjectPhaseGate phase : savedPhases) {
            boolean changed = false;
            List<String> starts = phaseTaskStarts.getOrDefault(phase.getId(), Collections.emptyList());
            List<String> ends   = phaseTaskEnds.getOrDefault(phase.getId(), Collections.emptyList());

            if (blankOrNull(phase.getPlannedStartDate()) && !starts.isEmpty()) {
                phase.setPlannedStartDate(starts.stream().min(String::compareTo).orElse(null));
                changed = true;
            }
            if (blankOrNull(phase.getPlannedEndDate()) && !ends.isEmpty()) {
                phase.setPlannedEndDate(ends.stream().max(String::compareTo).orElse(null));
                changed = true;
            }
            if (changed) phaseRepository.save(phase);
        }

        // 6. Project date roll-up (fill blank project dates from all tasks)
        boolean projChanged = false;
        if (blankOrNull(project.getPlannedStartDate()) && projectMinStart != null) {
            project.setPlannedStartDate(projectMinStart);
            projChanged = true;
        }
        if (blankOrNull(project.getPlannedEndDate()) && projectMaxEnd != null) {
            project.setPlannedEndDate(projectMaxEnd);
            projChanged = true;
        }
        if (projChanged) projectRepository.save(project);

        // 7. Build summary response
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("projectId", projectId);
        result.put("phasesCreated", phasesCreated);
        result.put("tasksCreated", tasksCreated);
        result.put("importLogs", importLogs);
        result.put("message", "WBS imported successfully: " + phasesCreated +
                " phases and " + tasksCreated + " tasks created.");
        System.out.println("Import Summary: " + phasesCreated + " phases, " + tasksCreated + " tasks.");
        return result;
    }

    private String extractLeadingInt(String wbsId) {
        if (wbsId == null || wbsId.isBlank()) return null;
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("^(\\d+).*");
        java.util.regex.Matcher m = p.matcher(wbsId.trim());
        if (m.find()) return m.group(1);
        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Excel parsing — returns list of lower-cased key maps
    // ─────────────────────────────────────────────────────────────────────────
    private List<Map<String, String>> parseExcel(MultipartFile file) {
        List<Map<String, String>> rows = new ArrayList<>();

        try (InputStream is = file.getInputStream();
             Workbook wb   = new XSSFWorkbook(is)) {

            Sheet sheet = wb.getSheetAt(0);
            FormulaEvaluator evaluator = wb.getCreationHelper().createFormulaEvaluator();

            // ── Find header row by scanning up to 10 rows for "WBS" ──────────
            int headerRowIdx = -1;
            Map<Integer, String> colKeyMap = new LinkedHashMap<>(); // colIdx → logical key

            for (int r = 0; r <= Math.min(sheet.getLastRowNum(), 10); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                boolean foundWbs = false;
                Map<Integer, String> candidate = new LinkedHashMap<>();

                for (int c = 0; c <= row.getLastCellNum(); c++) {
                    String val = getCellStr(row.getCell(c), evaluator).trim();
                    if (!val.isBlank()) {
                        // Normalise header to a logical key
                        String key = normaliseHeader(val);
                        candidate.put(c, key);
                        if (key.contains("wbs")) foundWbs = true;
                    }
                }

                if (foundWbs) {
                    headerRowIdx = r;
                    colKeyMap = candidate;
                    break;
                }
            }

            if (headerRowIdx < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Cannot find header row. Make sure the spreadsheet has a " +
                        "column named 'WBS_ID' (or similar) in one of the first 10 rows.");
            }

            System.out.println("--- Excel Header Mapping Detected ---");
            colKeyMap.forEach((idx, key) -> System.out.println("Column " + idx + " -> " + key));
            System.out.println("-------------------------------------");

            // ── Parse data rows ──────────────────────────────────────────────
            for (int r = headerRowIdx + 1; r <= sheet.getLastRowNum(); r++) {
                Row row = sheet.getRow(r);
                if (row == null) continue;

                Map<String, String> record = new LinkedHashMap<>();
                boolean hasAnyValue = false;

                for (Map.Entry<Integer, String> col : colKeyMap.entrySet()) {
                    int colIdx = col.getKey();
                    String key = col.getValue();
                    Cell cell  = row.getCell(colIdx);

                    String val;
                    if (isDateColumn(key)) {
                        val = getDateStr(cell, evaluator);
                    } else {
                        val = getCellStr(cell, evaluator).trim();
                    }

                    if (val != null && !val.isBlank()) hasAnyValue = true;
                    record.put(key, val == null ? "" : val);
                }

                if (!hasAnyValue) continue;
                rows.add(record);
            }

        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to read Excel file: " + e.getMessage(), e);
        }

        return rows;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Header normalisation — maps various header names to a canonical key
    // ─────────────────────────────────────────────────────────────────────────
    private String normaliseHeader(String raw) {
        String s = raw.toLowerCase()
                      .replace(" ", "")
                      .replace("_", "")
                      .replace("-", "");

        // Priority check: "activitytype" must be checked BEFORE "activity" or "name"
        if (s.contains("activitytype") || s.contains("類型") || s.contains("類型") || s.contains("類別")) 
            return "activitytype";
        if (s.contains("wbs"))            return "wbsid";
        if (s.contains("任務") || s.contains("activity") || s.contains("task") || s.contains("name") || s.contains("名稱"))
                                          return "name";
        if (s.contains("start"))          return "schedulestartdate";
        if (s.contains("end") || s.contains("finish")) return "scheduleenddate";
        if (s.contains("predecessor"))    return "predecessors";
        if (s.contains("owner") || s.contains("負責人") || s.contains("負責"))
                                          return "owner";
        if (s.contains("部門") || s.contains("dept") || s.contains("department"))
                                          return "department";
        if (s.contains("role") || s.contains("負責角色") || s.contains("角色"))
                                          return "responsiblerole";
        return s; // fallback: keep normalised
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DATA REPAIR UTILITY
    // ─────────────────────────────────────────────────────────────────────────
    @Transactional
    public Map<String, Object> repairProjectData(@SuppressWarnings("null") Long projectId) {
        @SuppressWarnings("null")
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));

        List<Task> badTasks = taskRepository.findByProjectIdOrderByDisplayOrderAsc(projectId);
        System.out.println("Repairing data for project " + projectId + ". Scanning " + badTasks.size() + " tasks.");

        int fixedPhases = 0;
        int fixedProjects = 0;
        int tasksReassigned = 0;
        ProjectPhaseGate currentPhase = null;

        for (Task t : badTasks) {
            String title = t.getTitle().toLowerCase();
            
            // Logic: if title IS "Project" or "Phase X"
            boolean isProj = title.contains("project");
            boolean isPh   = title.contains("phase");

            if (isProj) {
                // Update project dates if task has them
                if (!blankOrNull(t.getPlannedStartDate())) project.setPlannedStartDate(t.getPlannedStartDate());
                if (!blankOrNull(t.getPlannedEndDate()))   project.setPlannedEndDate(t.getPlannedEndDate());
                @SuppressWarnings({"null", "unused"})
                Project _unused = projectRepository.save(project);
                taskRepository.delete(t);
                fixedProjects++;
            } else if (isPh) {
                ProjectPhaseGate ph = new ProjectPhaseGate();
                ph.setProjectId(projectId);
                ph.setPhaseName(t.getTitle());
                ph.setPlannedStartDate(t.getPlannedStartDate());
                ph.setPlannedEndDate(t.getPlannedEndDate());
                ph.setDisplayOrder(t.getDisplayOrder());
                ph = phaseRepository.save(ph);
                currentPhase = ph;
                taskRepository.delete(t);
                fixedPhases++;
            } else {
                // Regular task - assign to last found phase
                if (currentPhase != null) {
                    t.setPhase(currentPhase.getPhaseName());
                    taskRepository.save(t);
                    tasksReassigned++;
                }
            }
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("fixedProjects", fixedProjects);
        res.put("fixedPhases", fixedPhases);
        res.put("tasksReassigned", tasksReassigned);
        res.put("message", "Repair complete. " + fixedPhases + " phases recovered, " + tasksReassigned + " tasks linked.");
        return res;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cell value helpers
    // ─────────────────────────────────────────────────────────────────────────
    private String getCellStr(Cell cell, FormulaEvaluator evaluator) {
        if (cell == null) return "";
        CellType type = resolveType(cell, evaluator);
        return switch (type) {
            case STRING  -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) yield ""; // date columns handled separately
                double d = cell.getNumericCellValue();
                yield (d == Math.floor(d) && !Double.isInfinite(d))
                        ? String.valueOf((long) d)
                        : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default -> "";
        };
    }

    private String getDateStr(Cell cell, FormulaEvaluator evaluator) {
        if (cell == null) return null;
        CellType type = resolveType(cell, evaluator);
        if (type == CellType.NUMERIC) {
            double num = cell.getNumericCellValue();
            if (num <= 0) return null;
            java.util.Date d = DateUtil.getJavaDate(num);
            return new SimpleDateFormat("yyyy-MM-dd").format(d);
        }
        if (type == CellType.STRING) {
            String s = cell.getStringCellValue().trim();
            if (s.isBlank()) return null;
            return s.replaceAll("[./]", "-"); // normalise separators
        }
        return null;
    }

    private CellType resolveType(Cell cell, FormulaEvaluator evaluator) {
        if (cell.getCellType() == CellType.FORMULA) {
            try { return evaluator.evaluateFormulaCell(cell); }
            catch (Exception e) { return CellType.STRING; }
        }
        return cell.getCellType();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Utility helpers
    // ─────────────────────────────────────────────────────────────────────────
    private boolean isDateColumn(String key) {
        return key.contains("date") || key.contains("start") || key.contains("end");
    }
    private static String nvl(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }
    private static boolean blankOrNull(String s) {
        return s == null || s.isBlank();
    }
    private static String minDate(String a, String b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.compareTo(b) <= 0 ? a : b;
    }
    private static String maxDate(String a, String b) {
        if (a == null) return b;
        if (b == null) return a;
        return a.compareTo(b) >= 0 ? a : b;
    }
}
