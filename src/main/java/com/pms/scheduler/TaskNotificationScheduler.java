package com.pms.scheduler;

import com.pms.entity.Task;
import com.pms.entity.User;
import com.pms.repository.TaskRepository;
import com.pms.repository.UserRepository;
import com.pms.service.MailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Component
public class TaskNotificationScheduler {

    @Autowired
    private TaskRepository taskRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MailService mailService;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * Runs daily at 8:00 AM UTC+8.
     * Identifies tasks starting tomorrow and notifies assigned users.
     */
    @Scheduled(cron = "0 0 8 * * *", zone = "GMT+8")
    public void notifyUpcomingTasks() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        String tomorrowStr = tomorrow.format(DATE_FORMATTER);

        System.out.println("Running task notification scheduler for date: " + tomorrowStr);

        List<Task> tasks = taskRepository.findByPlannedStartDate(tomorrowStr);

        for (Task task : tasks) {
            Long assigneeId = task.getAssigneeId();
            if (assigneeId != null) {
                Optional<User> userOpt = userRepository.findById(assigneeId);
                if (userOpt.isPresent()) {
                    User user = userOpt.get();
                    if (user.getEmail() != null && !user.getEmail().isEmpty()) {
                        sendNotification(user, task);
                    }
                }
            }
        }
    }

    private void sendNotification(User user, Task task) {
        String subject = "【任務通知】您的任務將在明天開始 - " + task.getTitle();
        String text = String.format(
            "親愛的 %s 您好，\n\n系統提醒您，專案任務「%s」預計將在明天 (%s) 開始。\n請準時開展工作並及時回報進度。\n\n祝您工作愉快！\nProject Management System",
            user.getName(),
            task.getTitle(),
            task.getPlannedStartDate()
        );

        try {
            mailService.sendSimpleMessage(user.getEmail(), subject, text);
            System.out.println("Email sent to: " + user.getEmail() + " for task: " + task.getTitle());
        } catch (Exception e) {
            System.err.println("Failed to send email to: " + user.getEmail() + ". Error: " + e.getMessage());
        }
    }
}
