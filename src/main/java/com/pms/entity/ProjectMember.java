package com.pms.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "PMS_PROJECT_MEMBERS")
public class ProjectMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "project_id", nullable = false)
    private Long projectId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "project_role", length = 50)
    private String projectRole; // 例如：Manager, Developer, Tester, Stakeholder

    @Column(name = "joined_at")
    private LocalDateTime joinedAt;

    public ProjectMember() {}

    public ProjectMember(Long projectId, Long userId, String projectRole) {
        this.projectId = projectId;
        this.userId = userId;
        this.projectRole = projectRole;
        this.joinedAt = LocalDateTime.now();
    }

    @PrePersist
    protected void onJoin() {
        this.joinedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getProjectId() { return projectId; }
    public void setProjectId(Long projectId) { this.projectId = projectId; }
    public Long getUserId() { return userId; }
    public void setUserId(Long userId) { this.userId = userId; }
    public String getProjectRole() { return projectRole; }
    public void setProjectRole(String projectRole) { this.projectRole = projectRole; }
    public LocalDateTime getJoinedAt() { return joinedAt; }
    public void setJoinedAt(LocalDateTime joinedAt) { this.joinedAt = joinedAt; }
}
