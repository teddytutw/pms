package com.pms.controller;

import com.pms.entity.ActivityTeamMember;
import com.pms.entity.Project;
import com.pms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/activity-teams")
@CrossOrigin(origins = "*")
public class ActivityTeamController {

    @Autowired private ActivityTeamMemberRepository teamRepo;
    @Autowired private UserRepository userRepo;
    @Autowired private ProjectRepository projectRepo;
    @Autowired private TaskRepository taskRepo;
    @Autowired private ProjectPhaseGateRepository phaseRepo;

    @GetMapping
    public List<Map<String, Object>> get(
            @RequestParam String targetType,
            @RequestParam String targetId) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (ActivityTeamMember m : teamRepo.findByTargetTypeAndTargetId(targetType, targetId)) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", m.getId());
            item.put("targetType", m.getTargetType());
            item.put("targetId", m.getTargetId());
            item.put("userId", m.getUserId());
            item.put("responsibility", m.getResponsibility());
            item.put("createdAt", m.getCreatedAt());
            userRepo.findById(m.getUserId()).ifPresent(u -> item.put("userName", u.getName()));
            result.add(item);
        }
        return result;
    }

    // ─── Dynamic Project Role Assignments ─────────────────────────────────

    /** GET /api/activity-teams/project-roles?projectId=X
     *  Returns { "ENG": 5, "BPM": 3 } — role → userId map */
    @GetMapping("/project-roles")
    public ResponseEntity<?> getProjectRoles(@RequestParam Long projectId) {
        Optional<Project> projOpt = projectRepo.findById(projectId);
        if (projOpt.isEmpty()) return ResponseEntity.notFound().build();
        Project proj = projOpt.get();

        // Start with hardcoded legacy columns for backward compatibility
        Map<String, Long> merged = new LinkedHashMap<>();
        if (proj.getBpmUserId()  != null) merged.put("BPM",  proj.getBpmUserId());
        if (proj.getMipmUserId() != null) merged.put("MIPM", proj.getMipmUserId());
        if (proj.getSqeUserId()  != null) merged.put("SQE",  proj.getSqeUserId());
        if (proj.getEngUserId()  != null) merged.put("ENG",  proj.getEngUserId());
        if (proj.getPurUserId()  != null) merged.put("PUR",  proj.getPurUserId());
        if (proj.getDqaUserId()  != null) merged.put("DQA",  proj.getDqaUserId());
        if (proj.getErdUserId()  != null) merged.put("ERD",  proj.getErdUserId());

        // Overlay with new dynamic PROJECT_ROLE entries (newer roles / overrides)
        for (ActivityTeamMember m : teamRepo.findByTargetTypeAndTargetId("PROJECT_ROLE", String.valueOf(projectId))) {
            merged.put(m.getResponsibility(), m.getUserId());
        }
        return ResponseEntity.ok(merged);
    }

    /** PUT /api/activity-teams/project-roles?projectId=X
     *  Body: { "ENG": 5, "BPM": 3, "PM": 9 }
     *  Replaces the PROJECT_ROLE entries for this project. */
    @PutMapping("/project-roles")
    public ResponseEntity<?> setProjectRoles(
            @RequestParam Long projectId,
            @RequestBody Map<String, Long> roleUserMap) {
        // Delete all existing PROJECT_ROLE entries for this project
        teamRepo.deleteByTargetTypeAndTargetId("PROJECT_ROLE", String.valueOf(projectId));
        // Re-save all non-null entries
        int saved = 0;
        for (Map.Entry<String, Long> entry : roleUserMap.entrySet()) {
            if (entry.getValue() != null && entry.getValue() > 0) {
                teamRepo.save(newMember("PROJECT_ROLE", String.valueOf(projectId), entry.getValue(), entry.getKey()));
                saved++;
            }
        }
        return ResponseEntity.ok(Map.of("saved", saved));
    }

    @PostMapping
    public ResponseEntity<?> add(@RequestBody ActivityTeamMember member) {
        if (teamRepo.existsByTargetTypeAndTargetIdAndUserId(
                member.getTargetType(), member.getTargetId(), member.getUserId()))
            return ResponseEntity.badRequest().body("User already in team");
        return ResponseEntity.ok(teamRepo.save(member));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> remove(@PathVariable Long id) {
        return teamRepo.findById(id).map(m -> {
            teamRepo.delete(m);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── Auto-assign from project role assignments ─────────────────────────────

    @PostMapping("/auto-assign")
    public ResponseEntity<?> autoAssign(@RequestParam Long projectId) {
        Optional<Project> projOpt = projectRepo.findById(projectId);
        if (projOpt.isEmpty()) return ResponseEntity.notFound().build();
        Project proj = projOpt.get();

        Map<String, Long> roleMap = buildRoleMap(proj);
        if (roleMap.isEmpty()) return ResponseEntity.ok(Map.of("assigned", 0));

        int count = 0;

        // Tasks
        for (var task : taskRepo.findByProjectIdOrderByDisplayOrderAsc(projectId)) {
            if (task.getResponsibleRoles() == null) continue;
            for (String role : task.getResponsibleRoles().split(",")) {
                Long uid = roleMap.get(role.trim());
                if (uid != null && !teamRepo.existsByTargetTypeAndTargetIdAndUserId(
                        "TASK", String.valueOf(task.getId()), uid)) {
                    teamRepo.save(newMember("TASK", String.valueOf(task.getId()), uid, "Owner"));
                    count++;
                }
            }
        }

        // Phases
        for (var phase : phaseRepo.findByProjectId(projectId)) {
            if (phase.getResponsibleRoles() == null) continue;
            String phaseTargetId = projectId + "-" + phase.getPhaseName();
            for (String role : phase.getResponsibleRoles().split(",")) {
                Long uid = roleMap.get(role.trim());
                if (uid != null && !teamRepo.existsByTargetTypeAndTargetIdAndUserId(
                        "PHASE", phaseTargetId, uid)) {
                    teamRepo.save(newMember("PHASE", phaseTargetId, uid, "Owner"));
                    count++;
                }
            }
        }

        // Project itself
        if (proj.getResponsibleRoles() != null) {
            String pid = String.valueOf(projectId);
            for (String role : proj.getResponsibleRoles().split(",")) {
                Long uid = roleMap.get(role.trim());
                if (uid != null && !teamRepo.existsByTargetTypeAndTargetIdAndUserId("PROJECT", pid, uid)) {
                    teamRepo.save(newMember("PROJECT", pid, uid, "Owner"));
                    count++;
                }
            }
        }

        return ResponseEntity.ok(Map.of("assigned", count));
    }

    private Map<String, Long> buildRoleMap(Project p) {
        Map<String, Long> m = new HashMap<>();
        // Legacy hardcoded columns (backward compatibility)
        if (p.getBpmUserId()  != null) m.put("BPM",  p.getBpmUserId());
        if (p.getMipmUserId() != null) m.put("MIPM", p.getMipmUserId());
        if (p.getSqeUserId()  != null) m.put("SQE",  p.getSqeUserId());
        if (p.getEngUserId()  != null) m.put("ENG",  p.getEngUserId());
        if (p.getPurUserId()  != null) m.put("PUR",  p.getPurUserId());
        if (p.getDqaUserId()  != null) m.put("DQA",  p.getDqaUserId());
        if (p.getErdUserId()  != null) m.put("ERD",  p.getErdUserId());
        // Dynamic PROJECT_ROLE assignments override / supplement legacy columns
        for (ActivityTeamMember atm : teamRepo.findByTargetTypeAndTargetId("PROJECT_ROLE", String.valueOf(p.getId()))) {
            m.put(atm.getResponsibility(), atm.getUserId());
        }
        return m;
    }

    private ActivityTeamMember newMember(String type, String tid, Long uid, String resp) {
        ActivityTeamMember m = new ActivityTeamMember();
        m.setTargetType(type);
        m.setTargetId(tid);
        m.setUserId(uid);
        m.setResponsibility(resp);
        return m;
    }
}
