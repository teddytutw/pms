package com.pms.controller;

import com.pms.entity.Task;
import com.pms.entity.ProjectPhaseGate;
import com.pms.repository.TaskRepository;
import com.pms.repository.ProjectPhaseGateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@CrossOrigin(origins = "http://localhost:5173")
public class TaskController {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private com.pms.service.StatusService statusService;

    @GetMapping("/project/{projectId}")
    public List<Task> getTasksByProject(@PathVariable long projectId) {
        List<Task> tasks = taskRepository.findByProjectIdOrderByDisplayOrderAsc(projectId);
        tasks.forEach(t -> t.setStatusIndicator(statusService.calculateTaskStatus(t)));
        return tasks;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Task> getTaskById(@PathVariable long id) {
        return taskRepository.findById(id)
                .map(task -> {
                    task.setStatusIndicator(statusService.calculateTaskStatus(task));
                    return ResponseEntity.ok(task);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Task createTask(@RequestBody Task task) {
        if (task.getStatus() == null || task.getStatus().isEmpty()) {
            task.setStatus("待辦");
        }
        task.setCreatedAt(LocalDateTime.now());
        return taskRepository.save(task);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Task> updateTask(@PathVariable long id, @RequestBody Task taskDetails) {
        return taskRepository.findById(id).map(task -> {
            if (taskDetails.getTitle() != null) task.setTitle(taskDetails.getTitle());
            if (taskDetails.getStatus() != null) task.setStatus(taskDetails.getStatus());
            if (taskDetails.getProjectId() != null) task.setProjectId(taskDetails.getProjectId());
            if (taskDetails.getAssigneeId() != null) task.setAssigneeId(taskDetails.getAssigneeId());
            if (taskDetails.getOwnerId() != null) task.setOwnerId(taskDetails.getOwnerId());
            if (taskDetails.getResponsibleRoles() != null) task.setResponsibleRoles(taskDetails.getResponsibleRoles());
            if (taskDetails.getPlannedStartDate() != null) task.setPlannedStartDate(taskDetails.getPlannedStartDate());
            if (taskDetails.getPlannedEndDate() != null) task.setPlannedEndDate(taskDetails.getPlannedEndDate());
            if (taskDetails.getPlannedDuration() != null) task.setPlannedDuration(taskDetails.getPlannedDuration());
            if (taskDetails.getActualStartDate() != null) task.setActualStartDate(taskDetails.getActualStartDate());
            if (taskDetails.getActualEndDate() != null) task.setActualEndDate(taskDetails.getActualEndDate());
            if (taskDetails.getActualDuration() != null) task.setActualDuration(taskDetails.getActualDuration());
            if (taskDetails.getPhase() != null) task.setPhase(taskDetails.getPhase());
            if (taskDetails.getEstimatedHours() != null) task.setEstimatedHours(taskDetails.getEstimatedHours());
            if (taskDetails.getActualHours() != null) task.setActualHours(taskDetails.getActualHours());
            if (taskDetails.getDisplayOrder() != null) task.setDisplayOrder(taskDetails.getDisplayOrder());
            if (taskDetails.getParentTaskId() != null) task.setParentTaskId(taskDetails.getParentTaskId());
            if (taskDetails.getPredecessors() != null) task.setPredecessors(taskDetails.getPredecessors());
            Task saved = taskRepository.save(task);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * PATCH: 輕量化更新，只更新提供的欄位 (用於 DnD 移動 phase/project)
     */
    @PatchMapping("/{id}")
    public ResponseEntity<Task> patchTask(@PathVariable long id, @RequestBody Map<String, Object> fields) {
        return taskRepository.findById(id).map(task -> {
            if (fields.containsKey("phase")) {
                task.setPhase((String) fields.get("phase"));
            }
            if (fields.containsKey("projectId")) {
                Object pid = fields.get("projectId");
                if (pid instanceof Number) {
                    task.setProjectId(((Number) pid).longValue());
                }
            }
            if (fields.containsKey("title")) {
                task.setTitle((String) fields.get("title"));
            }
            if (fields.containsKey("status")) {
                task.setStatus((String) fields.get("status"));
            }
            if (fields.containsKey("assigneeId")) {
                Object aid = fields.get("assigneeId");
                if (aid == null) {
                    task.setAssigneeId(null);
                } else if (aid instanceof Number) {
                    task.setAssigneeId(((Number) aid).longValue());
                } else {
                    try {
                        task.setAssigneeId(Long.parseLong(aid.toString()));
                    } catch (NumberFormatException e) {
                        task.setAssigneeId(null);
                    }
                }
            }
            if (fields.containsKey("ownerId")) {
                Object oid = fields.get("ownerId");
                if (oid == null) {
                    task.setOwnerId(null);
                } else if (oid instanceof Number) {
                    task.setOwnerId(((Number) oid).longValue());
                } else {
                    try {
                        task.setOwnerId(Long.parseLong(oid.toString()));
                    } catch (NumberFormatException e) {
                        task.setOwnerId(null);
                    }
                }
            }
            if (fields.containsKey("responsibleRoles")) {
                task.setResponsibleRoles((String) fields.get("responsibleRoles"));
            }
            if (fields.containsKey("plannedStartDate")) {
                task.setPlannedStartDate((String) fields.get("plannedStartDate"));
            }
            if (fields.containsKey("plannedEndDate")) {
                task.setPlannedEndDate((String) fields.get("plannedEndDate"));
            }
            if (fields.containsKey("actualStartDate")) {
                task.setActualStartDate((String) fields.get("actualStartDate"));
            }
            if (fields.containsKey("actualEndDate")) {
                task.setActualEndDate((String) fields.get("actualEndDate"));
            }
            if (fields.containsKey("displayOrder")) {
                Object dO = fields.get("displayOrder");
                if (dO instanceof Number) {
                    task.setDisplayOrder(((Number) dO).intValue());
                }
            }
            if (fields.containsKey("parentTaskId")) {
                Object pId = fields.get("parentTaskId");
                if (pId == null) {
                    task.setParentTaskId(null);
                } else if (pId instanceof Number) {
                    task.setParentTaskId(((Number) pId).longValue());
                }
            }
            if (fields.containsKey("predecessors")) {
                task.setPredecessors((String) fields.get("predecessors"));
            }
            @SuppressWarnings("null")
            final Task saved = taskRepository.save(task);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteTask(@PathVariable long id) {
        return taskRepository.findById(id).map(task -> {
            if (task != null) {
                taskRepository.delete(task);
            }
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @Autowired
    private ProjectPhaseGateRepository phaseRepository;

    @PostMapping("/{id}/adjust")
    public ResponseEntity<Task> adjustTask(@PathVariable long id, @RequestParam String direction) {
        return taskRepository.findById(id).map(task -> {
            String currentPhase = (task.getPhase() == null || task.getPhase().trim().isEmpty()) ? "" : task.getPhase().trim();
            Long projectId = task.getProjectId();
            
            List<Task> siblings = taskRepository.findByProjectIdOrderByDisplayOrderAsc(projectId).stream()
                .filter(t -> {
                    String p = (t.getPhase() == null || t.getPhase().trim().isEmpty()) ? "" : t.getPhase().trim();
                    return p.equals(currentPhase);
                })
                .sorted((a, b) -> {
                    int orderA = a.getDisplayOrder() != null ? a.getDisplayOrder() : 0;
                    int orderB = b.getDisplayOrder() != null ? b.getDisplayOrder() : 0;
                    if (orderA != orderB) return Integer.compare(orderA, orderB);
                    return Long.compare(a.getId(), b.getId());
                })
                .collect(Collectors.toList());

            int idx = siblings.indexOf(task);
            if (idx == -1) return ResponseEntity.ok(task);

            // 1. Indent / Outdent
            if ("indent".equals(direction)) {
                if (idx > 0) {
                    Task prev = siblings.get(idx - 1);
                    task.setParentTaskId(prev.getId());
                    taskRepository.saveAndFlush(task);
                }
                return ResponseEntity.ok(task);
            } else if ("outdent".equals(direction)) {
                if (task.getParentTaskId() != null) {
                    task.setParentTaskId(null);
                    taskRepository.saveAndFlush(task);
                } else if (!currentPhase.isEmpty()) {
                    // Outdenting a root-level phase task -> Move to Common Tasks
                    task.setPhase("");
                    task.setDisplayOrder(999);
                    taskRepository.saveAndFlush(task);
                }
                return ResponseEntity.ok(task);
            }

            // 2. Up / Down (Cross-Phase support)
            List<ProjectPhaseGate> phases = phaseRepository.findByProjectIdOrderByDisplayOrderAsc(projectId);
            List<String> phaseNames = phases.stream().map(p -> p.getPhaseName()).collect(Collectors.toList());
            phaseNames.add(""); // Common Tasks at the end

            int phaseIdx = phaseNames.indexOf(currentPhase);

            if ("up".equals(direction)) {
                if (idx > 0) {
                    // Normal swap up
                    Task prev = siblings.get(idx - 1);
                    siblings.set(idx - 1, task);
                    siblings.set(idx, prev);
                    for (int i = 0; i < siblings.size(); i++) siblings.get(i).setDisplayOrder(i + 1);
                    taskRepository.saveAll(siblings);
                } else if (phaseIdx > 0) {
                    // Jump to previous phase
                    task.setPhase(phaseNames.get(phaseIdx - 1));
                    task.setParentTaskId(null);
                    task.setDisplayOrder(999); // Will be at end of prev phase
                    taskRepository.saveAndFlush(task);
                }
            } else if ("down".equals(direction)) {
                if (idx < siblings.size() - 1) {
                    // Normal swap down
                    Task next = siblings.get(idx + 1);
                    siblings.set(idx + 1, task);
                    siblings.set(idx, next);
                    for (int i = 0; i < siblings.size(); i++) siblings.get(i).setDisplayOrder(i + 1);
                    taskRepository.saveAll(siblings);
                } else if (phaseIdx < phaseNames.size() - 1) {
                    // Jump to next phase
                    task.setPhase(phaseNames.get(phaseIdx + 1));
                    task.setParentTaskId(null);
                    task.setDisplayOrder(0); // Will be at start of next phase
                    taskRepository.saveAndFlush(task);
                }
            }

            return ResponseEntity.ok(task);
        }).orElse(ResponseEntity.notFound().build());
    }
}
