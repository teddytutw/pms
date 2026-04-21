package com.pms.repository;

import com.pms.entity.DeliverableWorkflow;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface DeliverableWorkflowRepository extends JpaRepository<DeliverableWorkflow, Long> {
    List<DeliverableWorkflow> findByDeliverableId(Long deliverableId);

    @Transactional
    void deleteByDeliverableId(Long deliverableId);
}
