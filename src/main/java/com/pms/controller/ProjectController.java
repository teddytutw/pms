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
    private com.pms.repository.TaskRepository taskRepository;

    @Autowired
    private com.pms.repository.ProjectPhaseGateRepository phaseRepository;

    @Autowired
    private com.pms.service.StatusService statusService;

    @Autowired
    private ExportService exportService;

    @Autowired
    private ImportService importService;

    @GetMapping
    public List<Project> getAllProjects() {
        List<Project> projects = projectRepository.findAll();
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
}
