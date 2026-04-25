package com.pms.controller;

import com.pms.entity.Project;
import com.pms.repository.ProjectRepository;
import com.pms.entity.ActivityTeamMember;
import com.pms.entity.ProjectMember;
import com.pms.entity.ProjectPhaseGate;
import com.pms.entity.Task;
import com.pms.repository.ActivityTeamMemberRepository;
import com.pms.repository.ProjectMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ContentDisposition;
import org.springframework.web.multipart.MultipartFile;
import com.pms.service.ExportService;
import com.pms.service.ImportService;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "http://localhost:5173")
public class ProjectController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectMemberRepository memberRepository;

    @Autowired
    private ActivityTeamMemberRepository teamMemberRepository;

    @Autowired
    private com.pms.repository.TaskRepository taskRepository;

    @Autowired
    private com.pms.repository.ProjectPhaseGateRepository phaseRepository;

    @Autowired
    private com.pms.service.StatusService statusService;

    @Autowired
    private ExportService exportService;

    @Autowired
    private ImportService importService;

    @Value("${pms.upload.dir:./pms-uploads}")
    private String uploadDir;

    private Path coverStorageLocation;

    @PostConstruct
    public void initCoverDir() {
        try {
            coverStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize().resolve("project-covers");
            Files.createDirectories(coverStorageLocation);
        } catch (Exception e) {
            throw new RuntimeException("無法建立封面圖片目錄", e);
        }
    }

    @GetMapping
    public List<Project> getAllProjects(@RequestParam(required = false) Long userId) {
        List<Project> projects = projectRepository.findAll();
        if (userId != null) {
            java.util.Set<String> memberTargetIds = teamMemberRepository
                .findByTargetTypeAndUserId("PROJECT", userId)
                .stream()
                .map(ActivityTeamMember::getTargetId)
                .collect(java.util.stream.Collectors.toSet());
            projects = projects.stream()
                .filter(p -> memberTargetIds.contains(String.valueOf(p.getId())))
                .collect(java.util.stream.Collectors.toList());
        }
        for (Project p : projects) {
            List<Task> tasks = taskRepository.findByProjectIdOrderByDisplayOrderAsc(p.getId());
            List<ProjectPhaseGate> phases = phaseRepository.findByProjectId(p.getId());
            statusService.enrichProject(p, phases, tasks);
        }
        return projects;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable long id) {
        return projectRepository.findById(id)
                .map(p -> {
                    List<Task> tasks = taskRepository.findByProjectIdOrderByDisplayOrderAsc(p.getId());
                    List<ProjectPhaseGate> phases = phaseRepository.findByProjectId(p.getId());
                    statusService.enrichProject(p, phases, tasks);
                    return ResponseEntity.ok(p);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Project createProject(@RequestBody Project project) {
        if (project.getCreatedAt() == null) {
            project.setCreatedAt(LocalDateTime.now());
        }
        return projectRepository.save(project);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Project> updateProject(@PathVariable long id, @RequestBody Project projectDetails) {
        return projectRepository.findById(id).map(project -> {
            if (projectDetails.getName() != null) project.setName(projectDetails.getName());
            if (projectDetails.getDescription() != null) project.setDescription(projectDetails.getDescription());
            if (projectDetails.getOwnerId() != null) project.setOwnerId(projectDetails.getOwnerId());
            if (projectDetails.getCurrentPhase() != null) project.setCurrentPhase(projectDetails.getCurrentPhase());
            if (projectDetails.getResponsibleRoles() != null) project.setResponsibleRoles(projectDetails.getResponsibleRoles());
            if (projectDetails.getPlannedStartDate() != null) project.setPlannedStartDate(projectDetails.getPlannedStartDate());
            if (projectDetails.getPlannedEndDate() != null) project.setPlannedEndDate(projectDetails.getPlannedEndDate());
            if (projectDetails.getPlannedDuration() != null) project.setPlannedDuration(projectDetails.getPlannedDuration());
            if (projectDetails.getActualStartDate() != null) project.setActualStartDate(projectDetails.getActualStartDate());
            if (projectDetails.getActualEndDate() != null) project.setActualEndDate(projectDetails.getActualEndDate());
            if (projectDetails.getActualDuration() != null) project.setActualDuration(projectDetails.getActualDuration());
            if (projectDetails.getBudget() != null) project.setBudget(projectDetails.getBudget());
            if (projectDetails.getStatus() != null) project.setStatus(projectDetails.getStatus());
            if (projectDetails.getExecutionStatus() != null) project.setExecutionStatus(projectDetails.getExecutionStatus());
            if (projectDetails.getProjectYear() != null) project.setProjectYear(projectDetails.getProjectYear());
            if (projectDetails.getIsTemplate() != null) project.setIsTemplate(projectDetails.getIsTemplate());
            
            // Role members (only update if provided)
            if (projectDetails.getBpmUserId() != null) project.setBpmUserId(projectDetails.getBpmUserId());
            if (projectDetails.getMipmUserId() != null) project.setMipmUserId(projectDetails.getMipmUserId());
            if (projectDetails.getSqeUserId() != null) project.setSqeUserId(projectDetails.getSqeUserId());
            if (projectDetails.getEngUserId() != null) project.setEngUserId(projectDetails.getEngUserId());
            if (projectDetails.getPurUserId() != null) project.setPurUserId(projectDetails.getPurUserId());
            if (projectDetails.getDqaUserId() != null) project.setDqaUserId(projectDetails.getDqaUserId());
            if (projectDetails.getErdUserId() != null) project.setErdUserId(projectDetails.getErdUserId());

            return ResponseEntity.ok(projectRepository.save(project));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> patchProject(@PathVariable long id, @RequestBody java.util.Map<String, Object> fields) {
        return projectRepository.findById(id).map(project -> {
            if (fields.containsKey("name")) {
                project.setName((String) fields.get("name"));
            }
            if (fields.containsKey("description")) {
                project.setDescription((String) fields.get("description"));
            }
            if (fields.containsKey("ownerId")) {
                Object oid = fields.get("ownerId");
                if (oid == null) {
                    project.setOwnerId(null);
                } else if (oid instanceof Number) {
                    project.setOwnerId(((Number) oid).longValue());
                }
            }
            if (fields.containsKey("responsibleRoles")) {
                project.setResponsibleRoles((String) fields.get("responsibleRoles"));
            }
            if (fields.containsKey("currentPhase")) {
                project.setCurrentPhase((String) fields.get("currentPhase"));
            }
            if (fields.containsKey("projectYear")) {
                project.setProjectYear((String) fields.get("projectYear"));
            }
            if (fields.containsKey("isTemplate")) {
                Object isT = fields.get("isTemplate");
                boolean templateVal;
                if (isT instanceof Boolean) {
                    templateVal = (Boolean) isT;
                } else if (isT != null) {
                    templateVal = Boolean.parseBoolean(isT.toString());
                } else {
                    templateVal = false;
                }
                project.setIsTemplate(templateVal);
                if (templateVal) {
                    project.setExecutionStatus("TEMPLATE");
                } else if ("TEMPLATE".equals(project.getExecutionStatus())) {
                    project.setExecutionStatus("NOT_STARTED");
                }
            }
            @SuppressWarnings("null")
            final Project saved = projectRepository.save(project);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(@PathVariable long id) {
        return projectRepository.findById(id).map(project -> {
            if (project != null) {
                projectRepository.delete(project);
            }
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/members")
    public List<ProjectMember> getProjectMembers(@PathVariable long id) {
        return memberRepository.findByProjectId(id);
    }

    @PostMapping("/{id}/members")
    public ProjectMember addMember(@PathVariable long id, @RequestBody ProjectMember member) {
        member.setProjectId(id);
        return memberRepository.save(member);
    }

    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<?> removeMember(@PathVariable long id, @PathVariable long userId) {
        return memberRepository.findByProjectIdAndUserId(id, userId).map(member -> {
            if (member != null) {
                memberRepository.delete(member);
            }
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<byte[]> exportProject(@PathVariable long id) {
        try {
            byte[] xmlContent = exportService.exportProjectToMspdi(id);
            Project project = projectRepository.findById(id).orElseThrow();
            String filename = project.getName().replaceAll("[\\\\/:*?\"<>|]", "_") + ".xml";

            @SuppressWarnings("null")
            final var response = ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                    .contentType(MediaType.APPLICATION_XML)
                    .body(xmlContent);
            return response;
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().build();
        }
    }

    @PostMapping(value = "/{id}/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> importWbs(@PathVariable long id,
                                       @RequestParam("file") MultipartFile file) {
        try {
            java.util.Map<String, Object> result = importService.importWbs(id, file);
            return ResponseEntity.ok(result);
        } catch (org.springframework.web.server.ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode())
                    .body(java.util.Map.of("error", rse.getReason()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of("error", "Internal error: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/repair-data")
    public ResponseEntity<?> repairData(@PathVariable long id) {
        try {
            java.util.Map<String, Object> result = importService.repairProjectData(id);
            return ResponseEntity.ok(result);
        } catch (org.springframework.web.server.ResponseStatusException rse) {
            return ResponseEntity.status(rse.getStatusCode())
                    .body(java.util.Map.of("error", rse.getReason()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(java.util.Map.of("error", "Repair failed: " + e.getMessage()));
        }
    }

    @PostMapping("/{id}/duplicate")
    public ResponseEntity<?> duplicateProject(@PathVariable long id, @RequestBody java.util.Map<String, Object> req) {
        try {
            Project source = projectRepository.findById(id).orElseThrow(() -> new RuntimeException("Project not found"));
            
            // 1. Calculate offset days
            long offsetDays = 0;
            String reqStart = (String) req.get("plannedStartDate");
            String reqEnd = (String) req.get("plannedEndDate");
            
            if (reqStart != null && !reqStart.isEmpty() && source.getPlannedStartDate() != null && !source.getPlannedStartDate().isEmpty()) {
                java.time.LocalDate newStart = java.time.LocalDate.parse(reqStart);
                java.time.LocalDate oldStart = java.time.LocalDate.parse(source.getPlannedStartDate().substring(0, 10));
                offsetDays = java.time.temporal.ChronoUnit.DAYS.between(oldStart, newStart);
            } else if (reqEnd != null && !reqEnd.isEmpty() && source.getPlannedEndDate() != null && !source.getPlannedEndDate().isEmpty()) {
                java.time.LocalDate newEnd = java.time.LocalDate.parse(reqEnd);
                java.time.LocalDate oldEnd = java.time.LocalDate.parse(source.getPlannedEndDate().substring(0, 10));
                offsetDays = java.time.temporal.ChronoUnit.DAYS.between(oldEnd, newEnd);
            }
            
            // 2. Clone Project
            Project target = new Project();
            target.setName((String) req.get("name"));
            target.setDescription((String) req.get("description"));
            target.setOwnerId(source.getOwnerId());
            target.setActivityType("PROJECT");
            target.setResponsibleRoles(source.getResponsibleRoles());
            target.setPlannedDuration(source.getPlannedDuration());
            
            if (req.containsKey("isTemplate")) {
                Object isT = req.get("isTemplate");
                target.setIsTemplate(Boolean.parseBoolean(String.valueOf(isT)));
            } else {
                target.setIsTemplate(false);
            }
            
            if (source.getPlannedStartDate() != null && !source.getPlannedStartDate().isEmpty()) {
                target.setPlannedStartDate(java.time.LocalDate.parse(source.getPlannedStartDate().substring(0, 10)).plusDays(offsetDays).toString());
            }
            if (source.getPlannedEndDate() != null && !source.getPlannedEndDate().isEmpty()) {
                target.setPlannedEndDate(java.time.LocalDate.parse(source.getPlannedEndDate().substring(0, 10)).plusDays(offsetDays).toString());
            }
            
            target.setBpmUserId(source.getBpmUserId());
            target.setMipmUserId(source.getMipmUserId());
            target.setSqeUserId(source.getSqeUserId());
            target.setEngUserId(source.getEngUserId());
            target.setPurUserId(source.getPurUserId());
            target.setDqaUserId(source.getDqaUserId());
            target.setErdUserId(source.getErdUserId());
            target.setCurrentPhase(source.getCurrentPhase());
            target.setBudget(source.getBudget());
            target.setStatus("ACTIVE");
            target.setProjectYear(source.getProjectYear());
            target.setExecutionStatus(target.getIsTemplate() ? "TEMPLATE" : "NOT_STARTED");
            
            Project savedTarget = projectRepository.save(target);
            
            // 3. Clone Phases
            List<ProjectPhaseGate> sourcePhases = phaseRepository.findByProjectId(id);
            for (ProjectPhaseGate sm : sourcePhases) {
                ProjectPhaseGate tm = new ProjectPhaseGate();
                tm.setProjectId(savedTarget.getId());
                tm.setPhaseName(sm.getPhaseName());
                tm.setGateStatus("PENDING");
                tm.setDisplayOrder(sm.getDisplayOrder());
                tm.setResponsibleRoles(sm.getResponsibleRoles());
                tm.setComments(sm.getComments());
                tm.setOwnerId(sm.getOwnerId());
                if (sm.getPlannedStartDate() != null) tm.setPlannedStartDate(java.time.LocalDate.parse(sm.getPlannedStartDate().substring(0, 10)).plusDays(offsetDays).toString());
                if (sm.getPlannedEndDate() != null) tm.setPlannedEndDate(java.time.LocalDate.parse(sm.getPlannedEndDate().substring(0, 10)).plusDays(offsetDays).toString());
                tm.setPlannedDuration(sm.getPlannedDuration());
                phaseRepository.save(tm);
            }
            
            // 4. Clone Tasks
            List<Task> sourceTasks = taskRepository.findByProjectIdOrderByDisplayOrderAsc(id);
            java.util.Map<Long, Long> taskIdMap = new java.util.HashMap<>();
            
            for (Task st : sourceTasks) {
                Task tt = new Task();
                tt.setTitle(st.getTitle());
                tt.setProjectId(savedTarget.getId());
                tt.setStatus("待辦");
                tt.setAssigneeId(st.getAssigneeId());
                tt.setOwnerId(st.getOwnerId());
                tt.setResponsibleRoles(st.getResponsibleRoles());
                tt.setPlannedDuration(st.getPlannedDuration());
                if (st.getPlannedStartDate() != null) tt.setPlannedStartDate(java.time.LocalDate.parse(st.getPlannedStartDate().substring(0, 10)).plusDays(offsetDays).toString());
                if (st.getPlannedEndDate() != null) tt.setPlannedEndDate(java.time.LocalDate.parse(st.getPlannedEndDate().substring(0, 10)).plusDays(offsetDays).toString());
                tt.setPhase(st.getPhase());
                tt.setEstimatedHours(st.getEstimatedHours());
                tt.setDisplayOrder(st.getDisplayOrder());
                tt.setParentTaskId(st.getParentTaskId());
                tt.setPredecessors(st.getPredecessors());
                Task savedTask = taskRepository.save(tt);
                taskIdMap.put(st.getId(), savedTask.getId());
            }
            
            // 5. Update Task parentIds based on map
            List<Task> newTasks = taskRepository.findByProjectIdOrderByDisplayOrderAsc(savedTarget.getId());
            for (Task nt : newTasks) {
                if (nt.getParentTaskId() != null && taskIdMap.containsKey(nt.getParentTaskId())) {
                    nt.setParentTaskId(taskIdMap.get(nt.getParentTaskId()));
                    taskRepository.save(nt);
                }
            }
            
            return ResponseEntity.ok(savedTarget);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(java.util.Map.of("error", e.getMessage()));
        }
    }

    @PostMapping(value = "/{id}/cover", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadCover(@PathVariable long id, @RequestParam("file") MultipartFile file) {
        return projectRepository.findById(id).map(project -> {
            if (file.isEmpty()) return ResponseEntity.badRequest().body((Object) "檔案不可為空");
            String ct = file.getContentType();
            if (ct == null || !ct.startsWith("image/"))
                return ResponseEntity.badRequest().body((Object) "請上傳圖片檔案");

            if (project.getCoverImagePath() != null) {
                try { Files.deleteIfExists(coverStorageLocation.resolve(project.getCoverImagePath())); }
                catch (IOException ignored) {}
            }

            String orig = file.getOriginalFilename();
            String ext = (orig != null && orig.contains(".")) ? orig.substring(orig.lastIndexOf('.')) : ".jpg";
            String filename = id + "_" + UUID.randomUUID().toString().replace("-", "") + ext;

            try {
                Files.copy(file.getInputStream(), coverStorageLocation.resolve(filename), StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                return ResponseEntity.internalServerError().body((Object) ("檔案儲存失敗: " + e.getMessage()));
            }

            project.setCoverImagePath(filename);
            return ResponseEntity.ok((Object) projectRepository.save(project));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}/cover")
    public ResponseEntity<?> deleteCover(@PathVariable long id) {
        return projectRepository.findById(id).map(project -> {
            if (project.getCoverImagePath() != null) {
                try { Files.deleteIfExists(coverStorageLocation.resolve(project.getCoverImagePath())); }
                catch (IOException ignored) {}
                project.setCoverImagePath(null);
                projectRepository.save(project);
            }
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/cover")
    public ResponseEntity<?> getCover(@PathVariable long id) {
        return projectRepository.findById(id).map(project -> {
            if (project.getCoverImagePath() == null) return ResponseEntity.notFound().build();
            try {
                Path filePath = coverStorageLocation.resolve(project.getCoverImagePath()).normalize();
                Resource resource = new UrlResource(filePath.toUri());
                if (!resource.exists() || !resource.isReadable()) return ResponseEntity.notFound().build();
                String contentType = Files.probeContentType(filePath);
                if (contentType == null) contentType = "image/jpeg";
                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CACHE_CONTROL, "max-age=3600")
                        .body(resource);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().build();
            }
        }).orElse(ResponseEntity.notFound().build());
    }
}
