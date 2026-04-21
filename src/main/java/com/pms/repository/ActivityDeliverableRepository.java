package com.pms.repository;

import com.pms.entity.ActivityDeliverable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActivityDeliverableRepository extends JpaRepository<ActivityDeliverable, Long> {
    List<ActivityDeliverable> findByTargetTypeAndTargetId(String targetType, String targetId);
    List<ActivityDeliverable> findByDeliverableId(Long deliverableId);
    boolean existsByTargetTypeAndTargetIdAndDeliverableId(String targetType, String targetId, Long deliverableId);
}
