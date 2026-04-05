package com.pms.controller;

import com.pms.entity.User;
import com.pms.repository.UserRepository;
import com.pms.service.LdapService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private LdapService ldapService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;
    
    @org.springframework.beans.factory.annotation.Value("${pms.auth.mode:DB}")
    private String authMode;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String loginInput = credentials.get("username");
        if (loginInput == null) loginInput = credentials.get("email"); 
        
        String password = credentials.get("password");

        // 1. 同時由 username 或 email 尋找使用者
        Optional<User> userOpt = userRepository.findByUsernameOrEmail(loginInput, loginInput);
        
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            
            boolean ldapAuthenticated = false;
            boolean dbAuthenticated = false;

            // 1. LDAP 驗證 (僅在 BOTH 或 LDAP 模式下執行)
            if ("BOTH".equalsIgnoreCase(authMode) || "LDAP".equalsIgnoreCase(authMode)) {
                if (ldapService.authenticate(loginInput, password)) {
                    System.out.println("LDAP Auth SUCCESS for: " + loginInput);
                    ldapAuthenticated = true;
                }
            }

            // 2. DB 密碼驗證 (僅在 BOTH (若 LDAP 失敗時) 或 DB 模式下執行)
            if ("DB".equalsIgnoreCase(authMode) || ("BOTH".equalsIgnoreCase(authMode) && !ldapAuthenticated)) {
                if (passwordEncoder.matches(password, user.getPassword())) {
                    System.out.println("Database Auth SUCCESS for: " + loginInput);
                    dbAuthenticated = true;
                }
            }

            if (ldapAuthenticated || dbAuthenticated) {
                return ResponseEntity.ok(user);
            }
        }
        
        return ResponseEntity.status(401).body(Map.of("message", "帳號或密碼錯誤。"));
    }
}
