package com.pms.repository;

import com.pms.entity.DeliverableTypeField;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

public interface DeliverableTypeFieldRepository extends JpaRepository<DeliverableTypeField, Long> {
    List<DeliverableTypeField> findByTypeIdOrderByFieldOrder(Long typeId);

    @Transactional
    void deleteByTypeId(Long typeId);
}
