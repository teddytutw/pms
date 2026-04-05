package com.pms.controller;

import com.pms.entity.Task;
import com.pms.repository.TaskRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

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
        List<Task> tasks = taskRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
        tasks.forEach(t -> t.setStatusIndicator(statusService.calculateTaskStatus(t)));
        return tasks;
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
            task.setTitle(taskDetails.getTitle());
            if (taskDetails.getStatus() != null) task.setStatus(taskDetails.getStatus());
            if (taskDetails.getProjectId() != null) task.setProjectId(taskDetails.getProjectId());
            if (taskDetails.getAssigneeId() != null) task.setAssigneeId(taskDetails.getAssigneeId());
            if (taskDetails.getPlannedStartDate() != null) task.setPlannedStartDate(taskDetails.getPlannedStartDate());
            if (taskDetails.getPlannedEndDate() != null) task.setPlannedEndDate(taskDetails.getPlannedEndDate());
            if (taskDetails.getActualStartDate() != null) task.setActualStartDate(taskDetails.getActualStartDate());
            if (taskDetails.getActualEndDate() != null) task.setActualEndDate(taskDetails.getActualEndDate());
            if (taskDetails.getPhase() != null) task.setPhase(taskDetails.getPhase());
            if (taskDetails.getEstimatedHours() != null) task.setEstimatedHours(taskDetails.getEstimatedHours());
            if (taskDetails.getActualHours() != null) task.setActualHours(taskDetails.getActualHours());
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
}
