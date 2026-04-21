package com.pms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "pms_activity_deliverables",
    uniqueConstraints = @UniqueConstraint(columnNames = {"target_type", "target_id", "deliverable_id"}))
public class ActivityDeliverable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "target_type", nullable = false, length = 20)
    private String targetType; // PROJECT, PHASE, TASK

    @Column(name = "target_id", nullable = false, length = 100)
    private String targetId;

    @Column(name = "deliverable_id", nullable = false)
    private Long deliverableId;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { this.createdAt = LocalDateTime.now(); }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getTargetType() { return targetType; }
    public void setTargetType(String targetType) { this.targetType = targetType; }
    public String getTargetId() { return targetId; }
    public void setTargetId(String targetId) { this.targetId = targetId; }
    public Long getDeliverableId() { return deliverableId; }
    public void setDeliverableId(Long deliverableId) { this.deliverableId = deliverableId; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
