package com.pms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "PMS_RESPONSIBLE_ROLES")
public class ResponsibleRole {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "role_name", nullable = false, unique = true, length = 100)
    private String roleName;

    public ResponsibleRole() {}

    public ResponsibleRole(String roleName) {
        this.roleName = roleName;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }
}
