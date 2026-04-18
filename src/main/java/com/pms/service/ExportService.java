package com.pms.service;

import com.pms.entity.Project;
import com.pms.entity.ProjectPhaseGate;
import com.pms.entity.Task;
import com.pms.repository.ProjectPhaseGateRepository;
import com.pms.repository.ProjectRepository;
import com.pms.repository.TaskRepository;
import org.mpxj.ProjectFile;
import org.mpxj.Relation;
import org.mpxj.RelationType;
import org.mpxj.mspdi.MSPDIWriter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExportService {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectPhaseGateRepository phaseRepository;

    @Autowired
    private TaskRepository taskRepository;


    public byte[] exportProjectToMspdi(Long projectId) throws Exception {
        @SuppressWarnings("null")
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new RuntimeException("Project not found: " + projectId));

        List<ProjectPhaseGate> phases = phaseRepository.findByProjectId(projectId);
        phases.sort(Comparator.comparing(p -> p.getDisplayOrder() != null ? p.getDisplayOrder() : 0));

        List<Task> allTasks = taskRepository.findByProjectIdOrderByDisplayOrderAsc(projectId);

        ProjectFile projectFile = new ProjectFile();
        projectFile.getProjectProperties().setProjectTitle(project.getName());
        projectFile.getProjectProperties().setStartDate(parseDate(project.getPlannedStartDate()));

        // Map to keep track of MPXJ tasks by entity ID for predecessor linking
        Map<Long, org.mpxj.Task> mpxjTaskMap = new HashMap<>();

        // 1. Create a root task for the project
        org.mpxj.Task rootTask = projectFile.addTask();
        rootTask.setName(project.getName());
        rootTask.setStart(parseDate(project.getPlannedStartDate()));
        rootTask.setFinish(parseDate(project.getPlannedEndDate()));
        rootTask.setActualStart(parseDate(project.getActualStartDate()));
        rootTask.setActualFinish(parseDate(project.getActualEndDate()));

        // 2. Add Phases and Tasks
        for (ProjectPhaseGate phase : phases) {
            org.mpxj.Task phaseTask = rootTask.addTask();
            phaseTask.setName("PHASE: " + phase.getPhaseName());
            phaseTask.setStart(parseDate(phase.getPlannedStartDate()));
            phaseTask.setFinish(parseDate(phase.getPlannedEndDate()));
            phaseTask.setActualStart(parseDate(phase.getActualStartDate()));
            phaseTask.setActualFinish(parseDate(phase.getActualEndDate()));

            // Find top-level tasks for this phase
            List<Task> rootPhaseTasks = allTasks.stream()
                    .filter(t -> phase.getPhaseName().equals(t.getPhase()) && t.getParentTaskId() == null)
                    .collect(Collectors.toList());

            for (Task entityTask : rootPhaseTasks) {
                mapTaskRecursive(phaseTask, entityTask, allTasks, mpxjTaskMap);
            }
        }

        // 3. Link Predecessors
        for (Task entityTask : allTasks) {
            if (entityTask.getPredecessors() != null && !entityTask.getPredecessors().isEmpty()) {
                org.mpxj.Task currentMpxjTask = mpxjTaskMap.get(entityTask.getId());
                if (currentMpxjTask != null) {
                    // Predecessors format: "T25, T26[FS+3]"
                    String[] preds = entityTask.getPredecessors().split(",");
                    for (String pred : preds) {
                        try {
                            // Extract ID from Txx
                            String idStr = pred.replaceAll("[^0-9]", "");
                            if (!idStr.isEmpty()) {
                                Long predId = Long.parseLong(idStr);
                                org.mpxj.Task predMpxjTask = mpxjTaskMap.get(predId);
                                if (predMpxjTask != null) {
                                    currentMpxjTask.addPredecessor(new Relation.Builder()
                                            .predecessorTask(predMpxjTask)
                                            .type(RelationType.FINISH_START));
                                }
                            }
                        } catch (Exception e) {
                            // Skip malformed predecessors
                        }
                    }
                }
            }
        }

        // 4. Write to XML
        ByteArrayOutputStream baos = new ByteArrayOutputStream();
        MSPDIWriter writer = new MSPDIWriter();
        writer.write(projectFile, baos);

        return baos.toByteArray();
    }

    private void mapTaskRecursive(org.mpxj.Task parentMpxjTask, Task entityTask, List<Task> allTasks, Map<Long, org.mpxj.Task> mpxjTaskMap) {
        org.mpxj.Task mpxjTask = parentMpxjTask.addTask();
        mpxjTask.setName(entityTask.getTitle());
        mpxjTask.setStart(parseDate(entityTask.getPlannedStartDate()));
        mpxjTask.setFinish(parseDate(entityTask.getPlannedEndDate()));
        mpxjTask.setActualStart(parseDate(entityTask.getActualStartDate()));
        mpxjTask.setActualFinish(parseDate(entityTask.getActualEndDate()));
        
        // Duration in MPXJ is usually set via start/finish, but we can also set it explicitly if needed
        
        mpxjTaskMap.put(entityTask.getId(), mpxjTask);

        // Find children
        List<Task> children = allTasks.stream()
                .filter(t -> entityTask.getId().equals(t.getParentTaskId()))
                .collect(Collectors.toList());

        for (Task child : children) {
            mapTaskRecursive(mpxjTask, child, allTasks, mpxjTaskMap);
        }
    }

    private LocalDateTime parseDate(String dateStr) {
        if (dateStr == null || dateStr.trim().isEmpty() || "-".equals(dateStr)) return null;
        try {
            // Support "yyyy-MM-dd" or "yyyy-MM-ddTHH:mm:ss"
            String clean = dateStr.contains("T") ? dateStr.split("T")[0] : dateStr;
            return java.time.LocalDate.parse(clean).atStartOfDay();
        } catch (Exception e) {
            return null;
        }
    }
}
