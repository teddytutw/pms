package com.pms.scheduler;

import com.pms.entity.*;
import com.pms.repository.*;
import com.pms.service.EmailTemplateService;
import com.pms.service.MailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Component
public class TaskNotificationScheduler {

    @Autowired private TaskRepository taskRepository;
    @Autowired private ProjectRepository projectRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private ActivityTeamMemberRepository teamMemberRepository;
    @Autowired private EmailTemplateRepository emailTemplateRepository;
    @Autowired private NotificationLogRepository notificationLogRepository;
    @Autowired private MailService mailService;
    @Autowired private EmailTemplateService emailTemplateService;

    @org.springframework.beans.factory.annotation.Value("${pms.app.base-url:http://localhost:8080}")
    private String appBaseUrl;

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    @Scheduled(cron = "0 0 8 * * *", zone = "GMT+8")
    public void runDailyNotifications() {
        LocalDate today = LocalDate.now();
        System.out.println("[Notification] Running daily notification scheduler: " + today);

        // 取出所有非 Template 專案 ID
        Set<Long> nonTemplateProjectIds = projectRepository.findAll().stream()
            .filter(p -> !Boolean.TRUE.equals(p.getIsTemplate()) && !"TEMPLATE".equals(p.getExecutionStatus()))
            .map(Project::getId)
            .collect(Collectors.toSet());

        if (nonTemplateProjectIds.isEmpty()) return;

        List<Task> allTasks = taskRepository.findAll();
        List<Task> tasks = allTasks.stream()
            .filter(t -> t.getProjectId() != null && nonTemplateProjectIds.contains(t.getProjectId()))
            .collect(Collectors.toList());

        // 預先載入 project 名稱 Map
        Map<Long, String> projectNameMap = projectRepository.findAll().stream()
            .filter(p -> nonTemplateProjectIds.contains(p.getId()))
            .collect(Collectors.toMap(Project::getId, Project::getName));

        for (Task task : tasks) {
            processTask(task, today, projectNameMap);
        }
    }

    private void processTask(Task task, LocalDate today, Map<Long, String> projectNameMap) {
        if (task.getPlannedStartDate() == null && task.getPlannedEndDate() == null) return;

        // RULE-1: 5 天前提醒（任務未完成且尚未開始）
        if (task.getPlannedStartDate() != null && !task.getPlannedStartDate().isEmpty()
                && task.getActualEndDate() == null || (task.getActualEndDate() != null && task.getActualEndDate().isEmpty())) {
            if (task.getPlannedStartDate() != null && !task.getPlannedStartDate().isEmpty()) {
                try {
                    LocalDate startDate = LocalDate.parse(task.getPlannedStartDate(), DATE_FMT);
                    long daysBefore = ChronoUnit.DAYS.between(today, startDate);
                    if (daysBefore == 5) {
                        sendNotification(task, "RULE-1", today, projectNameMap,
                            Map.of("daysBefore", "5", "daysOverdue", ""));
                    }
                } catch (Exception ignored) {}
            }
        }

        // RULE-2 & RULE-3: 逾期提醒（actualEndDate 為空）
        boolean notCompleted = task.getActualEndDate() == null || task.getActualEndDate().isEmpty();
        if (notCompleted && task.getPlannedEndDate() != null && !task.getPlannedEndDate().isEmpty()) {
            try {
                LocalDate endDate = LocalDate.parse(task.getPlannedEndDate(), DATE_FMT);
                long daysOverdue = ChronoUnit.DAYS.between(endDate, today);

                if (daysOverdue == 3) {
                    sendNotification(task, "RULE-2", today, projectNameMap,
                        Map.of("daysBefore", "", "daysOverdue", "3"));
                } else if (daysOverdue == 5) {
                    sendNotification(task, "RULE-3", today, projectNameMap,
                        Map.of("daysBefore", "", "daysOverdue", "5"));
                }
            } catch (Exception ignored) {}
        }
    }

    @SuppressWarnings("null")
    private void sendNotification(Task task, String ruleId, LocalDate today,
                                   Map<Long, String> projectNameMap, Map<String, String> ruleVars) {
        // 防重複
        if (notificationLogRepository.existsByTaskIdAndRuleIdAndTriggeredOn(task.getId(), ruleId, today)) {
            return;
        }

        // 取得啟用的 template
        Optional<EmailTemplate> templateOpt = emailTemplateRepository.findByRuleId(ruleId);
        if (templateOpt.isEmpty() || !Boolean.TRUE.equals(templateOpt.get().getEnabled())) return;
        EmailTemplate template = templateOpt.get();

        // 找 Task Owner（pms_activity_teams）
        List<ActivityTeamMember> owners = teamMemberRepository
            .findByTargetTypeAndTargetId("TASK", String.valueOf(task.getId()))
            .stream()
            .filter(m -> "Owner".equals(m.getResponsibility()))
            .collect(Collectors.toList());

        if (owners.isEmpty()) return;

        for (ActivityTeamMember owner : owners) {
            Optional<User> userOpt = userRepository.findById(owner.getUserId());
            if (userOpt.isEmpty()) continue;
            User user = userOpt.get();
            if (user.getEmail() == null || user.getEmail().isEmpty()) continue;

            String projectName = projectNameMap.getOrDefault(task.getProjectId(), "");

            Map<String, String> vars = new HashMap<>(ruleVars);
            vars.put("recipientName", user.getName());
            vars.put("taskTitle", task.getTitle());
            vars.put("projectName", projectName);
            vars.put("phaseName", task.getPhase() != null ? task.getPhase() : "");
            vars.put("plannedStartDate", task.getPlannedStartDate() != null ? task.getPlannedStartDate() : "");
            vars.put("plannedEndDate", task.getPlannedEndDate() != null ? task.getPlannedEndDate() : "");
            String baseUrl = appBaseUrl.endsWith("/") ? appBaseUrl.substring(0, appBaseUrl.length() - 1) : appBaseUrl;
            vars.put("taskUrl", baseUrl + "/details/TASK/" + task.getId());

            String subject = emailTemplateService.renderTemplate(template.getSubject(), vars);
            String body = emailTemplateService.renderTemplate(template.getBody(), vars);

            NotificationLog log = new NotificationLog();
            log.setTaskId(task.getId());
            log.setRuleId(ruleId);
            log.setTriggeredOn(today);
            log.setRecipientEmail(user.getEmail());
            log.setSentAt(LocalDateTime.now());

            try {
                mailService.sendSimpleMessage(user.getEmail(), subject, body);
                log.setSuccess(true);
                System.out.println("[Notification] Sent " + ruleId + " to " + user.getEmail()
                    + " for task: " + task.getTitle());
            } catch (Exception e) {
                log.setSuccess(false);
                log.setErrorMessage(e.getMessage() != null
                    ? e.getMessage().substring(0, Math.min(e.getMessage().length(), 500))
                    : "Unknown error");
                System.err.println("[Notification] Failed to send " + ruleId + " to " + user.getEmail()
                    + ": " + e.getMessage());
            }

            notificationLogRepository.save(log);
        }
    }
}
