package com.pms.controller;

import com.pms.entity.ProjectPhaseGate;
import com.pms.repository.ProjectPhaseGateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;

/**
 * PhaseController — 管理 Phase 的 Activity 基本資料 (owner, responsibleRoles, dates, durations)
 * Phase 以 projectId + phaseName 作為識別組合 (用於 WBS 詳細維護頁面)
 */
@RestController
@RequestMapping("/api/phases")
@CrossOrigin(origins = "*")
public class PhaseController {

    @Autowired
    private ProjectPhaseGateRepository phaseRepository;

    /**
     * 取得單一 Phase 的 Activity 資料 (by DB id)
     */
    @GetMapping("/{id}")
    public ResponseEntity<ProjectPhaseGate> getPhaseById(@PathVariable long id) {
        return phaseRepository.findById(id)
                .map(phase -> ResponseEntity.ok((ProjectPhaseGate) phase))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * 取得指定專案+階段名稱的 Phase Activity 資料
     * 若不存在則自動建立一筆空白記錄
     */
    @GetMapping("/project/{projectId}/name/{phaseName}")
    public ResponseEntity<ProjectPhaseGate> getPhaseByProjectAndName(
            @PathVariable Long projectId,
            @PathVariable String phaseName) {
        List<ProjectPhaseGate> list = phaseRepository.findByProjectId(projectId);
        Optional<ProjectPhaseGate> found = list.stream()
                .filter(p -> phaseName.equals(p.getPhaseName()))
                .findFirst();

        if (found.isPresent()) {
            return ResponseEntity.ok(found.get());
        }
        // 自動建立空白 Phase Activity 記錄
        ProjectPhaseGate newPhase = new ProjectPhaseGate();
        newPhase.setProjectId(projectId);
        newPhase.setPhaseName(phaseName);
        newPhase.setActivityType("PHASE");
        ProjectPhaseGate saved = phaseRepository.save(newPhase);
        return ResponseEntity.ok(saved);
    }

    /**
     * 更新 Phase Activity 欄位 (以 DB id 識別)
     */
    @PutMapping("/{id}")
    public ResponseEntity<ProjectPhaseGate> updatePhase(
            @PathVariable long id,
            @RequestBody ProjectPhaseGate phaseDetails) {
        return phaseRepository.findById(id).map(phase -> {
            if (phaseDetails.getPhaseName() != null) phase.setPhaseName(phaseDetails.getPhaseName());
            if (phaseDetails.getOwnerId() != null) phase.setOwnerId(phaseDetails.getOwnerId());
            if (phaseDetails.getResponsibleRoles() != null) phase.setResponsibleRoles(phaseDetails.getResponsibleRoles());
            if (phaseDetails.getPlannedStartDate() != null) phase.setPlannedStartDate(phaseDetails.getPlannedStartDate());
            if (phaseDetails.getPlannedEndDate() != null) phase.setPlannedEndDate(phaseDetails.getPlannedEndDate());
            if (phaseDetails.getPlannedDuration() != null) phase.setPlannedDuration(phaseDetails.getPlannedDuration());
            if (phaseDetails.getActualStartDate() != null) phase.setActualStartDate(phaseDetails.getActualStartDate());
            if (phaseDetails.getActualEndDate() != null) phase.setActualEndDate(phaseDetails.getActualEndDate());
            if (phaseDetails.getActualDuration() != null) phase.setActualDuration(phaseDetails.getActualDuration());
            if (phaseDetails.getComments() != null) phase.setComments(phaseDetails.getComments());
            @SuppressWarnings("null")
            ProjectPhaseGate saved = phaseRepository.save(phase);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    /**
     * 取得專案下所有 Phase Activity 記錄
     */
    @GetMapping("/project/{projectId}")
    public List<ProjectPhaseGate> getPhasesByProject(@PathVariable Long projectId) {
        return phaseRepository.findByProjectId(projectId);
    }
}
