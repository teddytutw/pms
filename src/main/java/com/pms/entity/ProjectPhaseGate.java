package com.pms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "PMS_PROJECT_PHASE_GATES")
public class ProjectPhaseGate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "activity_type", length = 20)
    private String activityType = "PHASE";
    
    @Column(name = "owner_id")
    private Long ownerId;

    @Column(name = "responsible_roles", length = 500)
    private String responsibleRoles;
    
    @Column(name = "project_id", nullable = false)
    private Long projectId;
    
    @Column(name = "phase_name", nullable = false, length = 100)
    private String phaseName; // "Initiation", "Planning", "Execution", "Monitoring", "Closing"
    
    @Column(name = "gate_status", length = 50)
    private String gateStatus; // "APPROVED", "REJECTED"
    
    @Column(name = "approver_id")
    private Long approverId;
    
    @Column(name = "approval_date")
    private LocalDateTime approvalDate;

    @Column(name = "planned_start_date", length = 50)
    private String plannedStartDate;

    @Column(name = "planned_end_date", length = 50)
    private String plannedEndDate;

    @Column(name = "actual_start_date", length = 50)
    private String actualStartDate;

    @Column(name = "actual_end_date", length = 50)
    private String actualEndDate;

    @Column(name = "display_order")
    private Integer displayOrder = 0;

    @Column(name = "planned_duration", length = 50)
    private String plannedDuration;

    @Column(name = "actual_duration", length = 50)
    private String actualDuration;
    
    @Column(length = 2000)
    private String comments;

    @Transient
    private String statusIndicator;

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getStatusIndicator() { return statusIndicator; }
    public void setStatusIndicator(String statusIndicator) { this.statusIndicator = statusIndicator; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public String getPhaseName() { return phaseName; }
    public void setPhaseName(String phaseName) { this.phaseName = phaseName; }
    public String getGateStatus() { return gateStatus; }
    public void setGateStatus(String gateStatus) { this.gateStatus = gateStatus; }
    public Long getApproverId() { return approverId; }
    public void setApproverId(Long approverId) { this.approverId = approverId; }
    public LocalDateTime getApprovalDate() { return approvalDate; }
    public void setApprovalDate(LocalDateTime approvalDate) { this.approvalDate = approvalDate; }
    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public String getActivityType() { return activityType; }
    public void setActivityType(String activityType) { this.activityType = activityType; }
    public Long getOwnerId() { return ownerId; }
    public void setOwnerId(Long ownerId) { this.ownerId = ownerId; }
    public String getResponsibleRoles() { return responsibleRoles; }
    public void setResponsibleRoles(String responsibleRoles) { this.responsibleRoles = responsibleRoles; }
    public String getPlannedStartDate() { return plannedStartDate; }
    public void setPlannedStartDate(String plannedStartDate) { this.plannedStartDate = plannedStartDate; }
    public String getPlannedEndDate() { return plannedEndDate; }
    public void setPlannedEndDate(String plannedEndDate) { this.plannedEndDate = plannedEndDate; }
    public String getActualStartDate() { return actualStartDate; }
    public void setActualStartDate(String actualStartDate) { this.actualStartDate = actualStartDate; }
    public String getActualEndDate() { return actualEndDate; }
    public void setActualEndDate(String actualEndDate) { this.actualEndDate = actualEndDate; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
    public String getPlannedDuration() { return plannedDuration; }
    public void setPlannedDuration(String plannedDuration) { this.plannedDuration = plannedDuration; }
    public String getActualDuration() { return actualDuration; }
    public void setActualDuration(String actualDuration) { this.actualDuration = actualDuration; }
}
