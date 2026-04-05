package com.pms.service;

import com.pms.entity.Project;
import com.pms.entity.ProjectPhaseGate;
import com.pms.entity.Task;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class StatusService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    public String calculateTaskStatus(Task task) {
        if (task.getActualEndDate() != null && !task.getActualEndDate().isEmpty()) {
            return "BLUE";
        }

        if (task.getPlannedEndDate() == null || task.getPlannedEndDate().isEmpty()) {
            return "GREEN"; // Default if no end date
        }

        LocalDate today = LocalDate.now(); // Note: Server time should be UTC+8
        LocalDate plannedEnd = LocalDate.parse(task.getPlannedEndDate(), DATE_FORMATTER);

        if (today.isBefore(plannedEnd) || today.isEqual(plannedEnd)) {
            return "GREEN";
        }

        long delayDays = java.time.temporal.ChronoUnit.DAYS.between(plannedEnd, today);

        if (delayDays <= 3) {
            return "YELLOW";
        } else {
            return "RED";
        }
    }

    public String aggregateStatus(List<String> statuses) {
        if (statuses.isEmpty()) return "GREEN";
        
        // Priority: RED > YELLOW > GREEN > BLUE
        if (statuses.contains("RED")) return "RED";
        if (statuses.contains("YELLOW")) return "YELLOW";
        if (statuses.contains("GREEN")) return "GREEN";
        return "BLUE";
    }

    public void enrichProject(Project project, List<ProjectPhaseGate> phases, List<Task> tasks) {
        // 1. Calculate Task Statuses
        tasks.forEach(t -> t.setStatusIndicator(calculateTaskStatus(t)));

        // 2. Calculate Phase Statuses (aggregation of tasks in that phase)
        phases.forEach(phase -> {
            List<String> phaseTaskStatuses = tasks.stream()
                    .filter(t -> phase.getPhaseName().equals(t.getPhase()))
                    .map(Task::getStatusIndicator)
                    .collect(Collectors.toList());
            phase.setStatusIndicator(aggregateStatus(phaseTaskStatuses));
        });

        // 3. Calculate Project Status (aggregation of phases)
        List<String> projectPhaseStatuses = phases.stream()
                .map(ProjectPhaseGate::getStatusIndicator)
                .collect(Collectors.toList());
        project.setStatusIndicator(aggregateStatus(projectPhaseStatuses));
    }
}
