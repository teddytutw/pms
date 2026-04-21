package com.pms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pms_deliverable_workflow_log")
public class DeliverableWorkflowLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deliverable_workflow_id", nullable = false)
    private Long deliverableWorkflowId;

    @Column(name = "step_id")
    private Long stepId;

    @Column(nullable = false, length = 20)
    private String action; // APPROVE, REJECT, START

    @Column(name = "action_by")
    private Long actionBy; // user id

    @Column(name = "action_at")
    private LocalDateTime actionAt;

    @Column(length = 1000)
    private String comments;

    @PrePersist
    protected void onCreate() { this.actionAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDeliverableWorkflowId() { return deliverableWorkflowId; }
    public void setDeliverableWorkflowId(Long deliverableWorkflowId) { this.deliverableWorkflowId = deliverableWorkflowId; }
    public Long getStepId() { return stepId; }
    public void setStepId(Long stepId) { this.stepId = stepId; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public Long getActionBy() { return actionBy; }
    public void setActionBy(Long actionBy) { this.actionBy = actionBy; }
    public LocalDateTime getActionAt() { return actionAt; }
    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }
}
