package com.pms;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class PmsApplication extends SpringBootServletInitializer {

    public static void main(String[] args) {
        SpringApplication.run(PmsApplication.class, args);
    }

    @org.springframework.context.annotation.Bean
    public org.springframework.boot.CommandLineRunner initUsernames(com.pms.repository.UserRepository userRepository) {
        return args -> {
            java.util.List<com.pms.entity.User> users = userRepository.findAll();
            for (com.pms.entity.User user : users) {
                if (user.getUsername() == null || user.getUsername().isBlank()) {
                    user.setUsername(user.getName());
                    userRepository.save(user);
                }
            }
        };
    }

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder builder) {
        return builder.sources(PmsApplication.class);
    }
}
