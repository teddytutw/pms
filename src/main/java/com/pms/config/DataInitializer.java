package com.pms.config;

import com.pms.entity.ResponsibleRole;
import com.pms.repository.ResponsibleRoleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Arrays;
import java.util.List;

@Configuration
public class DataInitializer {

    @Bean
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
}
