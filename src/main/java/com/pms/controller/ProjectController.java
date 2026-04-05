package com.pms.controller;

import com.pms.entity.Project;
import com.pms.repository.ProjectRepository;
import com.pms.entity.ProjectMember;
import com.pms.entity.ProjectPhaseGate;
import com.pms.entity.Task;
import com.pms.repository.ProjectMemberRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "http://localhost:5173")
public class ProjectController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectMemberRepository memberRepository;

    @Autowired
    private com.pms.repository.TaskRepository taskRepository;

    @Autowired
    private com.pms.repository.ProjectPhaseGateRepository phaseRepository;

    @Autowired
    private com.pms.service.StatusService statusService;

    @GetMapping
    public List<Project> getAllProjects() {
        List<Project> projects = projectRepository.findAll();
        for (Project p : projects) {
            List<Task> tasks = taskRepository.findByProjectIdOrderByCreatedAtDesc(p.getId());
            List<ProjectPhaseGate> phases = phaseRepository.findByProjectId(p.getId());
            statusService.enrichProject(p, phases, tasks);
        }
        return projects;
    }

    @GetMapping("/{id}")
    public ResponseEntity<Project> getProjectById(@PathVariable long id) {
        return projectRepository.findById(id)
                .map(p -> {
                    List<Task> tasks = taskRepository.findByProjectIdOrderByCreatedAtDesc(p.getId());
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
            project.setName(projectDetails.getName());
            project.setDescription(projectDetails.getDescription());
            project.setOwnerId(projectDetails.getOwnerId());
            project.setPlannedStartDate(projectDetails.getPlannedStartDate());
            project.setPlannedEndDate(projectDetails.getPlannedEndDate());
            project.setBudget(projectDetails.getBudget());
            project.setStatus(projectDetails.getStatus());
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
            if (fields.containsKey("currentPhase")) {
                project.setCurrentPhase((String) fields.get("currentPhase"));
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
}
