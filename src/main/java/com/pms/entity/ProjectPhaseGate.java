package com.pms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "PMS_PROJECT_PHASE_GATES")
public class ProjectPhaseGate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
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
}
