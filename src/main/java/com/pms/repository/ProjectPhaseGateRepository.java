package com.pms.repository;

import com.pms.entity.ProjectPhaseGate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ProjectPhaseGateRepository extends JpaRepository<ProjectPhaseGate, Long> {
    List<ProjectPhaseGate> findByProjectIdOrderByApprovalDateDesc(Long projectId);
    List<ProjectPhaseGate> findByProjectId(Long projectId);
}
