package com.pms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "pms_deliverable_field_values",
    uniqueConstraints = @UniqueConstraint(columnNames = {"deliverable_id", "field_def_id"}))
public class DeliverableFieldValue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "deliverable_id", nullable = false)
    private Long deliverableId;

    @Column(name = "field_def_id", nullable = false)
    private Long fieldDefId;

    @Column(columnDefinition = "TEXT")
    private String fieldValue;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getDeliverableId() { return deliverableId; }
    public void setDeliverableId(Long deliverableId) { this.deliverableId = deliverableId; }
    public Long getFieldDefId() { return fieldDefId; }
    public void setFieldDefId(Long fieldDefId) { this.fieldDefId = fieldDefId; }
    public String getFieldValue() { return fieldValue; }
    public void setFieldValue(String fieldValue) { this.fieldValue = fieldValue; }
}
