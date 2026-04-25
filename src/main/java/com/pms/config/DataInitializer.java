package com.pms.config;

import com.pms.entity.EmailTemplate;
import com.pms.entity.ResponsibleRole;
import com.pms.repository.EmailTemplateRepository;
import com.pms.repository.ResponsibleRoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import java.util.Arrays;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
    @Order(1)
    public CommandLineRunner initRoles(ResponsibleRoleRepository repository) {
        return args -> {
            List<String> defaultRoles = Arrays.asList("BPM", "MIPM", "SQE", "ENG", "PUR", "DQA", "ERD");
            for (String roleName : defaultRoles) {
                if (repository.findByRoleName(roleName).isEmpty()) {
                    repository.save(new ResponsibleRole(roleName));
                }
            }
        };
    }

    @Bean
    @Order(2)
    public CommandLineRunner initEmailTemplates(EmailTemplateRepository repository) {
        return args -> {
            insertIfAbsent(repository, "RULE-1", "任務即將開始提醒",
                "【任務提醒】您的任務「{{taskTitle}}」將於 {{daysBefore}} 天後開始",
                "親愛的 {{recipientName}} 您好，\n\n" +
                "系統提醒您，任務「{{taskTitle}}」（專案：{{projectName}} / 階段：{{phaseName}}）\n" +
                "計畫開始日為 {{plannedStartDate}}，距今還有 {{daysBefore}} 天。\n" +
                "請提前做好準備。\n\n" +
                "前往任務頁面：{{taskUrl}}\n\n" +
                "Project Management System");

            insertIfAbsent(repository, "RULE-2", "任務輕微逾期提醒",
                "【逾期提醒】任務「{{taskTitle}}」已超過計畫結束日 {{daysOverdue}} 天",
                "親愛的 {{recipientName}} 您好，\n\n" +
                "任務「{{taskTitle}}」（專案：{{projectName}} / 階段：{{phaseName}}）\n" +
                "計畫結束日為 {{plannedEndDate}}，目前已逾期 {{daysOverdue}} 天。\n" +
                "請盡速更新任務進度或完成日期。\n\n" +
                "前往任務頁面：{{taskUrl}}\n\n" +
                "Project Management System");

            insertIfAbsent(repository, "RULE-3", "任務嚴重逾期提醒",
                "【嚴重逾期】任務「{{taskTitle}}」已超過計畫結束日 {{daysOverdue}} 天，請立即處理",
                "親愛的 {{recipientName}} 您好，\n\n" +
                "任務「{{taskTitle}}」（專案：{{projectName}} / 階段：{{phaseName}}）\n" +
                "計畫結束日為 {{plannedEndDate}}，目前已嚴重逾期 {{daysOverdue}} 天。\n" +
                "此為第二次提醒，情況嚴重，請立即協調資源處理。\n\n" +
                "前往任務頁面：{{taskUrl}}\n\n" +
                "Project Management System");
        };
    }

    private void insertIfAbsent(EmailTemplateRepository repo, String ruleId, String ruleName,
                                 String subject, String body) {
        if (repo.findByRuleId(ruleId).isEmpty()) {
            EmailTemplate t = new EmailTemplate();
            t.setRuleId(ruleId);
            t.setRuleName(ruleName);
            t.setSubject(subject);
            t.setBody(body);
            t.setEnabled(true);
            repo.save(t);
        }
    }
}
