package com.pms.repository;

import com.pms.entity.EmailTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface EmailTemplateRepository extends JpaRepository<EmailTemplate, Long> {
    Optional<EmailTemplate> findByRuleId(String ruleId);
}
