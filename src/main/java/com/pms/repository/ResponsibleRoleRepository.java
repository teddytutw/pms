package com.pms.repository;

import com.pms.entity.ResponsibleRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ResponsibleRoleRepository extends JpaRepository<ResponsibleRole, Long> {
    Optional<ResponsibleRole> findByRoleName(String roleName);
}
