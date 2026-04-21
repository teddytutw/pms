package com.pms.repository;

import com.pms.entity.DeliverableWorkflowLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DeliverableWorkflowLogRepository extends JpaRepository<DeliverableWorkflowLog, Long> {
    List<DeliverableWorkflowLog> findByDeliverableWorkflowIdOrderByActionAtDesc(Long deliverableWorkflowId);
}
