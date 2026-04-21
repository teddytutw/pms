package com.pms.repository;

import com.pms.entity.DeliverableFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface DeliverableFieldValueRepository extends JpaRepository<DeliverableFieldValue, Long> {
    List<DeliverableFieldValue> findByDeliverableId(Long deliverableId);

    @Transactional
    void deleteByDeliverableId(Long deliverableId);
}
