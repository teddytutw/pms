package com.pms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "pms_deliverable_type_fields")
public class DeliverableTypeField {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "type_id", nullable = false)
    private Long typeId;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Column(name = "field_type", length = 20)
    private String fieldType = "TEXT"; // TEXT, DATE, SELECT, NUMBER

    @Column(name = "field_options", columnDefinition = "TEXT")
    private String fieldOptions; // JSON array for SELECT type e.g. ["Option A","Option B"]

    @Column(name = "field_order")
    private Integer fieldOrder = 0;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTypeId() { return typeId; }
    public void setTypeId(Long typeId) { this.typeId = typeId; }
    public String getFieldName() { return fieldName; }
    public void setFieldName(String fieldName) { this.fieldName = fieldName; }
    public String getFieldType() { return fieldType; }
    public void setFieldType(String fieldType) { this.fieldType = fieldType; }
    public String getFieldOptions() { return fieldOptions; }
    public void setFieldOptions(String fieldOptions) { this.fieldOptions = fieldOptions; }
    public Integer getFieldOrder() { return fieldOrder; }
    public void setFieldOrder(Integer fieldOrder) { this.fieldOrder = fieldOrder; }
}
