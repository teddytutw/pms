package com.pms.repository;

import com.pms.entity.Deliverable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface DeliverableRepository extends JpaRepository<Deliverable, Long> {

    @Query("SELECT d FROM Deliverable d WHERE LOWER(d.name) LIKE LOWER(CONCAT('%', :kw, '%'))")
    List<Deliverable> searchByKeyword(@Param("kw") String keyword);
}
