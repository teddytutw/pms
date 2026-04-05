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
}
