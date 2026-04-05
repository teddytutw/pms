package com.pms.repository;

import com.pms.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    List<Task> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<Task> findByPlannedStartDate(String plannedStartDate);
    @org.springframework.lang.NonNull
    List<Task> findAll();
}
