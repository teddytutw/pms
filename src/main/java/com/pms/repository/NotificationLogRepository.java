package com.pms.repository;

import com.pms.entity.NotificationLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDate;

public interface NotificationLogRepository extends JpaRepository<NotificationLog, Long> {
    boolean existsByTaskIdAndRuleIdAndTriggeredOn(Long taskId, String ruleId, LocalDate triggeredOn);
}
