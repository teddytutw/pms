package com.pms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "PMS_PROJECTS")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 500)
    private String description;
    
    @Column(name = "owner_id")
    private Long ownerId; // 專案負責人 (Owner)

    @Column(name = "activity_type", length = 20)
    private String activityType = "PROJECT";

    @Column(name = "responsible_roles", length = 500)
    private String responsibleRoles; // 多選下拉 (多個 role name 以逗號分隔)

    @Column(name = "planned_duration", length = 50)
    private String plannedDuration;

    @Column(name = "actual_duration", length = 50)
    private String actualDuration;

    // 專案成員 (Project Members) - 各角色指派的使用者 ID
    @Column(name = "bpm_user_id") private Long bpmUserId;
    @Column(name = "mipm_user_id") private Long mipmUserId;
    @Column(name = "sqe_user_id") private Long sqeUserId;
    @Column(name = "eng_user_id") private Long engUserId;
    @Column(name = "pur_user_id") private Long purUserId;
    @Column(name = "dqa_user_id") private Long dqaUserId;
    @Column(name = "erd_user_id") private Long erdUserId;

    @Column(name = "current_phase", length = 50)
    private String currentPhase = "Initiation"; // 預設為啟動階段

    // 時程基準 (預定)
    @Column(name = "planned_start_date", length = 50)
    private String plannedStartDate;
    
    @Column(name = "planned_end_date", length = 50)
    private String plannedEndDate;

    // 實際時程
    @Column(name = "actual_start_date", length = 50)
    private String actualStartDate;
    
    @Column(name = "actual_end_date", length = 50)
    private String actualEndDate;

    @Column(name = "budget")
    private Double budget; // 專案預算 (PMP Cost Management)

    @Column(name = "status", length = 20)
    private String status = "ACTIVE"; // ACTIVE, ARCHIVED, DELETED

    @Column(name = "project_year", length = 10)
    private String projectYear; // e.g. "2024"

    @Column(name = "execution_status", length = 20)
    private String executionStatus = "NOT_STARTED"; // NOT_STARTED, STARTED, TEMPLATE

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Transient
    private String statusIndicator; // BLUE, GREEN, YELLOW, RED

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.currentPhase == null) this.currentPhase = "Initiation";
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public String getCurrentPhase() { return currentPhase; }
    public void setCurrentPhase(String currentPhase) { this.currentPhase = currentPhase; }
    public String getPlannedStartDate() { return plannedStartDate; }
    public void setPlannedStartDate(String plannedStartDate) { this.plannedStartDate = plannedStartDate; }
    public String getPlannedEndDate() { return plannedEndDate; }
    public void setPlannedEndDate(String plannedEndDate) { this.plannedEndDate = plannedEndDate; }
    public String getActualStartDate() { return actualStartDate; }
    public void setActualStartDate(String actualStartDate) { this.actualStartDate = actualStartDate; }
    public String getActualEndDate() { return actualEndDate; }
    public void setActualEndDate(String actualEndDate) { this.actualEndDate = actualEndDate; }
    public Double getBudget() { return budget; }
    public void setBudget(Double budget) { this.budget = budget; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public String getStatusIndicator() { return statusIndicator; }
    public void setStatusIndicator(String statusIndicator) { this.statusIndicator = statusIndicator; }

    public String getActivityType() { return activityType; }
    public void setActivityType(String activityType) { this.activityType = activityType; }
    public String getResponsibleRoles() { return responsibleRoles; }
    public void setResponsibleRoles(String responsibleRoles) { this.responsibleRoles = responsibleRoles; }
    public String getPlannedDuration() { return plannedDuration; }
    public void setPlannedDuration(String plannedDuration) { this.plannedDuration = plannedDuration; }
    public String getActualDuration() { return actualDuration; }
    public void setActualDuration(String actualDuration) { this.actualDuration = actualDuration; }

    public Long getBpmUserId() { return bpmUserId; }
    public void setBpmUserId(Long bpmUserId) { this.bpmUserId = bpmUserId; }
    public Long getMipmUserId() { return mipmUserId; }
    public void setMipmUserId(Long mipmUserId) { this.mipmUserId = mipmUserId; }
    public Long getSqeUserId() { return sqeUserId; }
    public void setSqeUserId(Long sqeUserId) { this.sqeUserId = sqeUserId; }
    public Long getEngUserId() { return engUserId; }
    public void setEngUserId(Long engUserId) { this.engUserId = engUserId; }
    public Long getPurUserId() { return purUserId; }
    public void setPurUserId(Long purUserId) { this.purUserId = purUserId; }
    public Long getDqaUserId() { return dqaUserId; }
    public void setDqaUserId(Long dqaUserId) { this.dqaUserId = dqaUserId; }
    public Long getErdUserId() { return erdUserId; }
    public void setErdUserId(Long erdUserId) { this.erdUserId = erdUserId; }

    public String getProjectYear() { return projectYear; }
    public void setProjectYear(String projectYear) { this.projectYear = projectYear; }
    public String getExecutionStatus() { return executionStatus; }
    public void setExecutionStatus(String executionStatus) { this.executionStatus = executionStatus; }
}
