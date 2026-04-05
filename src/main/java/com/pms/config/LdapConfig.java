package com.pms.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
@ConfigurationProperties(prefix = "ldap-config")
@Data
public class LdapConfig {
    private List<LdapServerInfo> ldaps;

    @Data
    public static class LdapServerInfo {
        private String url;
        private String username;
        private String password;
        private List<String> bases;
    }
}
