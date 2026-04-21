package com.pms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pms_deliverable_workflows",
    uniqueConstraints = @UniqueConstraint(columnNames = {"deliverable_id", "workflow_id"}))
public class DeliverableWorkflow {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deliverable_id", nullable = false)
    private Long deliverableId;

    @Column(name = "workflow_id", nullable = false)
    private Long workflowId;

    @Column(name = "current_step_id")
    private Long currentStepId; // null means workflow completed

    @Column(name = "started_at", updatable = false)
    private LocalDateTime startedAt;

    @PrePersist
    protected void onCreate() { this.startedAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDeliverableId() { return deliverableId; }
    public void setDeliverableId(Long deliverableId) { this.deliverableId = deliverableId; }
    public Long getWorkflowId() { return workflowId; }
    public void setWorkflowId(Long workflowId) { this.workflowId = workflowId; }
    public Long getCurrentStepId() { return currentStepId; }
    public void setCurrentStepId(Long currentStepId) { this.currentStepId = currentStepId; }
    public LocalDateTime getStartedAt() { return startedAt; }
}
