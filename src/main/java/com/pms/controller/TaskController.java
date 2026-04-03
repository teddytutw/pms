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

    @GetMapping("/project/{projectId}")
    public List<Task> getTasksByProject(@PathVariable long projectId) {
        return taskRepository.findByProjectIdOrderByCreatedAtDesc(projectId);
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
            if (taskDetails.getStartDate() != null) task.setStartDate(taskDetails.getStartDate());
            if (taskDetails.getEndDate() != null) task.setEndDate(taskDetails.getEndDate());
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
