package com.pms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "PMS_TASKS")
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String title;

    @Column(name = "project_id")
    private Long projectId; // 改為 ID 強關聯

    @Column(name = "parent_task_id")
    private Long parentTaskId; // 支援 WBS 巢狀結構 (Sub-tasks)

    @Column(length = 50)
    private String status;

    @Column(name = "assignee_id")
    private Long assigneeId; // 指派人員 / 執行者 (資源)

    @Column(name = "planned_start_date", length = 50)
    private String plannedStartDate;

    @Column(name = "planned_end_date", length = 50)
    private String plannedEndDate;

    @Column(name = "actual_start_date", length = 50)
    private String actualStartDate;

    @Column(name = "actual_end_date", length = 50)
    private String actualEndDate;

    @Column(name = "estimated_hours")
    private Integer estimatedHours; // 預估工時

    @Column(name = "actual_hours")
    private Integer actualHours; // 實際工時

    @Column(length = 50)
    private String phase; // 此任務隸屬於專案中的哪個生命週期階段

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public Long getParentTaskId() { return parentTaskId; }
    public void setParentTaskId(Long parentTaskId) { this.parentTaskId = parentTaskId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Long getAssigneeId() { return assigneeId; }
    public void setAssigneeId(Long assigneeId) { this.assigneeId = assigneeId; }
    public String getPlannedStartDate() { return plannedStartDate; }
    public void setPlannedStartDate(String plannedStartDate) { this.plannedStartDate = plannedStartDate; }
    public String getPlannedEndDate() { return plannedEndDate; }
    public void setPlannedEndDate(String plannedEndDate) { this.plannedEndDate = plannedEndDate; }
    public String getActualStartDate() { return actualStartDate; }
    public void setActualStartDate(String actualStartDate) { this.actualStartDate = actualStartDate; }
    public String getActualEndDate() { return actualEndDate; }
    public void setActualEndDate(String actualEndDate) { this.actualEndDate = actualEndDate; }
    public Integer getEstimatedHours() { return estimatedHours; }
    public void setEstimatedHours(Integer estimatedHours) { this.estimatedHours = estimatedHours; }
    public Integer getActualHours() { return actualHours; }
    public void setActualHours(Integer actualHours) { this.actualHours = actualHours; }
    public String getPhase() { return phase; }
    public void setPhase(String phase) { this.phase = phase; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
