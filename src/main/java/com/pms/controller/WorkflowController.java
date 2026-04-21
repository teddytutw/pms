package com.pms.controller;

import com.pms.entity.Workflow;
import com.pms.entity.WorkflowStep;
import com.pms.repository.WorkflowRepository;
import com.pms.repository.WorkflowStepRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/workflows")
@CrossOrigin(origins = "*")
public class WorkflowController {

    @Autowired private WorkflowRepository wfRepo;
    @Autowired private WorkflowStepRepository stepRepo;

    @GetMapping
    public List<Map<String, Object>> getAll() {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Workflow w : wfRepo.findAll()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", w.getId());
            m.put("name", w.getName());
            m.put("description", w.getDescription());
            m.put("createdAt", w.getCreatedAt());
            m.put("steps", stepRepo.findByWorkflowIdOrderByStepOrder(w.getId()));
            result.add(m);
        }
        return result;
    }

    @PostMapping
    public Workflow create(@RequestBody Workflow w) {
        return wfRepo.save(w);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Workflow w) {
        return wfRepo.findById(id).map(ex -> {
            ex.setName(w.getName());
            ex.setDescription(w.getDescription());
            return ResponseEntity.ok(wfRepo.save(ex));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return wfRepo.findById(id).map(w -> {
            stepRepo.deleteByWorkflowId(id);
            wfRepo.delete(w);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- Steps sub-resource ---

    @PostMapping("/{workflowId}/steps")
    public WorkflowStep addStep(@PathVariable Long workflowId, @RequestBody WorkflowStep s) {
        s.setWorkflowId(workflowId);
        return stepRepo.save(s);
    }

    @PutMapping("/steps/{stepId}")
    public ResponseEntity<?> updateStep(@PathVariable Long stepId, @RequestBody WorkflowStep s) {
        return stepRepo.findById(stepId).map(ex -> {
            ex.setStepName(s.getStepName());
            ex.setStepOrder(s.getStepOrder());
            ex.setDescription(s.getDescription());
            return ResponseEntity.ok(stepRepo.save(ex));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/steps/{stepId}")
    public ResponseEntity<?> deleteStep(@PathVariable Long stepId) {
        return stepRepo.findById(stepId).map(s -> {
            stepRepo.delete(s);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
