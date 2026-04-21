package com.pms.repository;

import com.pms.entity.WorkflowStep;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface WorkflowStepRepository extends JpaRepository<WorkflowStep, Long> {
    List<WorkflowStep> findByWorkflowIdOrderByStepOrder(Long workflowId);

    @Transactional
    void deleteByWorkflowId(Long workflowId);
}
