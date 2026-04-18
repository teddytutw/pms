package com.pms.controller;

import com.pms.entity.User;
import com.pms.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "http://localhost:5173")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // 取得所有使用者
    @GetMapping
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // 取得單一使用者
    @GetMapping("/{id}")
    public ResponseEntity<User> getUserById(@PathVariable long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // 建立新使用者
    @PostMapping
    public ResponseEntity<?> createUser(@RequestBody Map<String, Object> payload) {
        try {
            String email = (String) payload.get("email");
            String username = (String) payload.get("username");
            String name = (String) payload.get("name");
            String role = (String) payload.get("role");
            String password = (String) payload.get("password");

            if (username == null || username.isBlank() || name == null || name.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("message", "帳號與姓名為必填欄位"));
            }

            // 檢查 username 是否重複
            if (userRepository.findByUsername(username).isPresent()) {
                return ResponseEntity.badRequest().body(Map.of("message", "此帳號 ( " + username + " ) 已被使用！"));
            }

            User newUser = new User();
            newUser.setName(name);
            newUser.setUsername(username);
            newUser.setEmail(email);
            newUser.setRole(role != null ? role : "MEMBER");
            // 若未提供密碼，則預設為 123456
            String rawPassword = (password != null && !password.isBlank()) ? password : "123456";
            newUser.setPassword(passwordEncoder.encode(rawPassword));

            if (payload.containsKey("bu")) newUser.setBu((String) payload.get("bu"));
            if (payload.containsKey("factory")) newUser.setFactory((String) payload.get("factory"));
            if (payload.containsKey("jobRole")) newUser.setJobRole((String) payload.get("jobRole"));
            if (payload.containsKey("dept")) newUser.setDept((String) payload.get("dept"));
            if (payload.containsKey("enabled")) {
                Object enabledObj = payload.get("enabled");
                if (enabledObj instanceof Boolean) {
                    newUser.setEnabled((Boolean) enabledObj);
                } else if (enabledObj instanceof String) {
                    newUser.setEnabled(Boolean.parseBoolean((String) enabledObj));
                }
            }

            User savedUser = userRepository.save(newUser);
            return ResponseEntity.ok(savedUser);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            String msg = e.getMostSpecificCause().getMessage();
            if (msg.contains("unique") || msg.contains("UNIQUE")) {
                return ResponseEntity.badRequest().body(Map.of("message", "資料重複：帳號或電子郵件已存在。"));
            }
            return ResponseEntity.badRequest().body(Map.of("message", "資料庫限制錯誤：" + msg));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("message", "系統錯誤：" + e.getMessage()));
        }
    }

    // 更新使用者資料 (不含密碼)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable long id, @RequestBody Map<String, Object> payload) {
        return userRepository.findById(id).map(user -> {
            if (payload.containsKey("name") && payload.get("name") != null && !((String)payload.get("name")).isBlank()) {
                user.setName((String) payload.get("name"));
            }
            if (payload.containsKey("username") && payload.get("username") != null && !((String)payload.get("username")).isBlank()) {
                String newUsername = (String) payload.get("username");
                if (!newUsername.equals(user.getUsername())) {
                    if (userRepository.findByUsername(newUsername).isPresent()) {
                        return ResponseEntity.badRequest().body(Map.of("message", "此帳號已被其他使用者使用！"));
                    }
                    user.setUsername(newUsername);
                }
            }
            if (payload.containsKey("role")) {
                user.setRole((String) payload.get("role"));
            }
            if (payload.containsKey("email") && payload.get("email") != null && !((String)payload.get("email")).isBlank()) {
                user.setEmail((String) payload.get("email"));
            }
            // 若有提供新密碼，則更新
            if (payload.containsKey("password") && payload.get("password") != null && !((String)payload.get("password")).isBlank()) {
                user.setPassword(passwordEncoder.encode((String) payload.get("password")));
            }
            
            if (payload.containsKey("bu")) user.setBu((String) payload.get("bu"));
            if (payload.containsKey("factory")) user.setFactory((String) payload.get("factory"));
            if (payload.containsKey("jobRole")) user.setJobRole((String) payload.get("jobRole"));
            if (payload.containsKey("dept")) user.setDept((String) payload.get("dept"));
            if (payload.containsKey("enabled")) {
                Object enabledObj = payload.get("enabled");
                if (enabledObj instanceof Boolean) {
                    user.setEnabled((Boolean) enabledObj);
                } else if (enabledObj instanceof String) {
                    user.setEnabled(Boolean.parseBoolean((String) enabledObj));
                }
            }
            
            @SuppressWarnings("null")
            User saved = userRepository.save(user);
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    // 刪除使用者
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable long id) {
        return userRepository.findById(id).map(user -> {
            if (user != null) {
                userRepository.delete(user);
            }
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
