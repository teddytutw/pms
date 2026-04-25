package com.pms.service;

import com.pms.entity.EmailTemplate;
import com.pms.repository.EmailTemplateRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class EmailTemplateService {

    @Autowired
    private EmailTemplateRepository repository;

    public List<EmailTemplate> findAll() {
        return repository.findAll();
    }

    public Optional<EmailTemplate> findByRuleId(String ruleId) {
        return repository.findByRuleId(ruleId);
    }

    @SuppressWarnings("null")
    public EmailTemplate save(EmailTemplate template) {
        return repository.save(template);
    }

    public String renderTemplate(String text, Map<String, String> vars) {
        for (Map.Entry<String, String> entry : vars.entrySet()) {
            text = text.replace("{{" + entry.getKey() + "}}", entry.getValue() != null ? entry.getValue() : "");
        }
        return text;
    }
}
