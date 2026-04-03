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
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> payload) {
        String email = payload.get("email");
        String name = payload.get("name");
        String role = payload.get("role");
        String password = payload.get("password");

        if (email == null || email.isBlank() || name == null || name.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "姓名與電子郵件為必填欄位"));
        }

        // 檢查 email 是否重複
        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("message", "此電子郵件已被使用！"));
        }

        User newUser = new User();
        newUser.setName(name);
        newUser.setEmail(email);
        newUser.setRole(role != null ? role : "MEMBER");
        // 若未提供密碼，則預設為 123456
        String rawPassword = (password != null && !password.isBlank()) ? password : "123456";
        newUser.setPassword(passwordEncoder.encode(rawPassword));

        return ResponseEntity.ok(userRepository.save(newUser));
    }

    // 更新使用者資料 (不含密碼)
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable long id, @RequestBody Map<String, String> payload) {
        return userRepository.findById(id).map(user -> {
            if (payload.containsKey("name") && !payload.get("name").isBlank()) {
                user.setName(payload.get("name"));
            }
            if (payload.containsKey("role")) {
                user.setRole(payload.get("role"));
            }
            // 若有提供新密碼，則更新
            if (payload.containsKey("password") && !payload.get("password").isBlank()) {
                user.setPassword(passwordEncoder.encode(payload.get("password")));
            }
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
