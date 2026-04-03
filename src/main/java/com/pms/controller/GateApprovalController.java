package com.pms.controller;

import com.pms.entity.Project;
import com.pms.entity.ProjectPhaseGate;
import com.pms.repository.ProjectRepository;
import com.pms.repository.ProjectPhaseGateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/projects/{projectId}/gates")
@CrossOrigin(origins = "http://localhost:5173")
public class GateApprovalController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private ProjectPhaseGateRepository gateRepository;

    @GetMapping
    public List<ProjectPhaseGate> getGates(
            @PathVariable("projectId") @org.springframework.lang.NonNull Long projectId) {
        return gateRepository.findByProjectIdOrderByApprovalDateDesc(projectId);
    }

    @PostMapping("/approve")
    public ResponseEntity<?> approveGate(@PathVariable("projectId") @org.springframework.lang.NonNull Long projectId,
            @RequestBody ProjectPhaseGate gateRequest) {
        Project project = projectRepository.findById(projectId).orElse(null);
        if (project == null)
            return ResponseEntity.notFound().build();

        // 嚴格審核：確認傳入的 approver 是否就是此專案的 Owner
        if (project.getOwnerId() != null && !project.getOwnerId().equals(gateRequest.getApproverId())) {
            return ResponseEntity.badRequest().body(Map.of("message", "Permission Denied: 僅有專案發起人 (Owner) 可以簽核關卡！"));
        }

        // 紀錄這筆 Go/Kill 的簽核結果
        gateRequest.setProjectId(projectId);
        gateRequest.setApprovalDate(LocalDateTime.now());
        gateRequest.setGateStatus("APPROVED"); // 簡化展示直接核准
        gateRepository.save(gateRequest);

        // 推動專案的進入下個階段
        String nextPhase = getNextPhase(project.getCurrentPhase());
        project.setCurrentPhase(nextPhase);
        projectRepository.save(project);

        return ResponseEntity.ok(project); // 回傳更新後的專案與階段
    }

    // PMP 標準關卡轉移邏輯
    private String getNextPhase(String current) {
        if (current == null)
            return "Planning";
        switch (current) {
            case "Initiation":
                return "Planning";
            case "Planning":
                return "Execution";
            case "Execution":
                return "Monitoring";
            case "Monitoring":
                return "Closing";
            default:
                return "Closing";
        }
    }
}
