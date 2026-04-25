package com.pms.controller;

import com.pms.entity.EmailTemplate;
import com.pms.service.EmailTemplateService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/email-templates")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:3000"})
public class EmailTemplateController {

    @Autowired
    private EmailTemplateService service;

    @org.springframework.beans.factory.annotation.Value("${pms.app.base-url:http://localhost:8080/pms}")
    private String appBaseUrl;

    @GetMapping
    public List<EmailTemplate> getAll() {
        return service.findAll();
    }

    @PutMapping("/{ruleId}")
    public ResponseEntity<?> update(@PathVariable String ruleId,
                                     @RequestBody Map<String, Object> body) {
        Optional<EmailTemplate> opt = service.findByRuleId(ruleId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        EmailTemplate template = opt.get();

        if (body.containsKey("subject")) {
            template.setSubject((String) body.get("subject"));
        }
        if (body.containsKey("body")) {
            template.setBody((String) body.get("body"));
        }
        if (body.containsKey("enabled")) {
            Object enabled = body.get("enabled");
            if (enabled instanceof Boolean) {
                template.setEnabled((Boolean) enabled);
            }
        }

        return ResponseEntity.ok(service.save(template));
    }

    @PostMapping("/preview")
    public ResponseEntity<Map<String, String>> preview(@RequestBody Map<String, Object> body) {
        String ruleId = (String) body.get("ruleId");
        Optional<EmailTemplate> opt = service.findByRuleId(ruleId);
        if (opt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        EmailTemplate template = opt.get();

        Map<String, String> vars = new HashMap<>();
        vars.put("recipientName", "張三");
        vars.put("taskTitle", "範例任務名稱");
        vars.put("projectName", "範例專案");
        vars.put("phaseName", "開發階段");
        vars.put("plannedStartDate", "2026-05-01");
        vars.put("plannedEndDate", "2026-05-31");
        vars.put("daysBefore", "5");
        vars.put("daysOverdue", "3");
        String baseUrl = appBaseUrl.endsWith("/") ? appBaseUrl.substring(0, appBaseUrl.length() - 1) : appBaseUrl;
        vars.put("taskUrl", baseUrl + "/details/TASK/123");

        // 允許呼叫端覆寫變數
        Object customVars = body.get("vars");
        if (customVars instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                if (entry.getKey() instanceof String k && entry.getValue() instanceof String v) {
                    vars.put(k, v);
                }
            }
        }

        Map<String, String> result = new HashMap<>();
        result.put("subject", service.renderTemplate(template.getSubject(), vars));
        result.put("body", service.renderTemplate(template.getBody(), vars));
        return ResponseEntity.ok(result);
    }
}
