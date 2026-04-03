package com.pms.config;

import com.pms.entity.ProjectMember;
import com.pms.repository.ProjectMemberRepository;
import com.pms.entity.Project;
import com.pms.repository.ProjectRepository;
import com.pms.entity.Task;
import com.pms.repository.TaskRepository;
import com.pms.entity.User;
import com.pms.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.List;

@Configuration
public class DataLoader {

    @Bean
    CommandLineRunner initDatabase(UserRepository userRepository, ProjectRepository projectRepository, TaskRepository taskRepository, ProjectMemberRepository memberRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            // 1. 確保初始測試人員存在且密碼已正確加密 (123456)
            String defaultPass = passwordEncoder.encode("123456");
            
            String[][] initialUsers = {
                {"Alice Project Manager", "alice@pms.com", "OWNER"},
                {"Bob Developer", "bob@pms.com", "MEMBER"},
                {"Charlie Tester", "charlie@pms.com", "MEMBER"}
            };

            for (String[] userData : initialUsers) {
                User user = userRepository.findByEmail(userData[1]).orElse(new User());
                user.setName(userData[0]);
                user.setEmail(userData[1]);
                user.setRole(userData[2]);
                user.setPassword(defaultPass);
                userRepository.save(user);
            }

            // 2. 獲取核心人員 ID (用於後續邏輯)
            User alice = userRepository.findByEmail("alice@pms.com").orElse(null);
            User bob = userRepository.findByEmail("bob@pms.com").orElse(null);

            // 3. 確保至少有一個範例專案
            if (projectRepository.count() == 0 && alice != null) {
                Project p = new Project();
                p.setName("企業級系統開發專案");
                p.setDescription("這是一個具備 WBS 階層與 Phase-Gate 審核機制的高階專案。");
                p.setOwnerId(alice.getId());
                p.setPlannedStartDate("2024-04-01");
                p.setPlannedEndDate("2024-12-31");
                p.setBudget(1000000.0);
                p = projectRepository.save(p);

                // 為專案加入團隊成員
                if (bob != null) {
                    memberRepository.save(new ProjectMember(p.getId(), bob.getId(), "Lead Developer"));
                    memberRepository.save(new ProjectMember(p.getId(), alice.getId(), "Project Manager"));
                }
            }

            // 4. 自動修復舊資料
            List<Project> allProjects = projectRepository.findAll();
            List<Task> tasks = taskRepository.findAll();

            for (Task t : tasks) {
                boolean changed = false;
                if (t.getProjectId() == null && !allProjects.isEmpty()) {
                    t.setProjectId(allProjects.get(0).getId());
                    changed = true;
                }
                if (t.getPlannedStartDate() == null || t.getPlannedStartDate().isEmpty()) {
                    t.setPlannedStartDate("2024-04-01");
                    changed = true;
                }
                if (t.getPlannedEndDate() == null || t.getPlannedEndDate().isEmpty()) {
                    t.setPlannedEndDate("2024-05-08");
                    changed = true;
                }
                if (changed) taskRepository.save(t);
            }
        };
    }
}
