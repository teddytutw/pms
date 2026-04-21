package com.pms.controller;

import com.pms.entity.*;
import com.pms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/deliverables")
@CrossOrigin(origins = "*")
public class DeliverableController {

    @Autowired private DeliverableRepository delRepo;
    @Autowired private DeliverableFieldValueRepository fvRepo;
    @Autowired private DeliverableWorkflowRepository dwRepo;
    @Autowired private DeliverableWorkflowLogRepository logRepo;
    @Autowired private WorkflowRepository wfRepo;
    @Autowired private WorkflowStepRepository stepRepo;
    @Autowired private ActivityDeliverableRepository adRepo;

    // ─── CRUD ─────────────────────────────────────────────────────────────────

    @GetMapping
    public List<Deliverable> search(@RequestParam(required = false) String keyword) {
        if (keyword != null && !keyword.isBlank()) return delRepo.searchByKeyword(keyword);
        return delRepo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getById(@PathVariable Long id) {
        return delRepo.findById(id).map(d -> {
            Map<String, Object> r = new LinkedHashMap<>();
            r.put("id", d.getId());
            r.put("name", d.getName());
            r.put("typeId", d.getTypeId());
            r.put("description", d.getDescription());
            r.put("createdBy", d.getCreatedBy());
            r.put("createdAt", d.getCreatedAt());
            r.put("fieldValues", fvRepo.findByDeliverableId(id));
            return ResponseEntity.ok(r);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Deliverable create(@RequestBody Deliverable d) {
        return delRepo.save(d);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return delRepo.findById(id).map(d -> {
            if (body.containsKey("name")) d.setName((String) body.get("name"));
            if (body.containsKey("description")) d.setDescription((String) body.get("description"));
            if (body.containsKey("typeId") && body.get("typeId") != null)
                d.setTypeId(Long.valueOf(body.get("typeId").toString()));
            else if (body.containsKey("typeId")) d.setTypeId(null);
            delRepo.save(d);

            if (body.containsKey("fieldValues")) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> fvList = (List<Map<String, Object>>) body.get("fieldValues");
                fvRepo.deleteByDeliverableId(id);
                for (Map<String, Object> fv : fvList) {
                    if (fv.get("fieldDefId") == null) continue;
                    DeliverableFieldValue v = new DeliverableFieldValue();
                    v.setDeliverableId(id);
                    v.setFieldDefId(Long.valueOf(fv.get("fieldDefId").toString()));
                    v.setFieldValue(fv.get("fieldValue") != null ? fv.get("fieldValue").toString() : "");
                    fvRepo.save(v);
                }
            }
            return ResponseEntity.ok(d);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return delRepo.findById(id).map(d -> {
            fvRepo.deleteByDeliverableId(id);
            dwRepo.deleteByDeliverableId(id);
            delRepo.delete(d);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // ─── Where Used ───────────────────────────────────────────────────────────

    @GetMapping("/{id}/where-used")
    public List<ActivityDeliverable> whereUsed(@PathVariable Long id) {
        return adRepo.findByDeliverableId(id);
    }

    // ─── Workflow Management ──────────────────────────────────────────────────

    @GetMapping("/{id}/workflows")
    public List<Map<String, Object>> getWorkflows(@PathVariable Long id) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (DeliverableWorkflow dw : dwRepo.findByDeliverableId(id)) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", dw.getId());
            m.put("deliverableId", dw.getDeliverableId());
            m.put("workflowId", dw.getWorkflowId());
            m.put("currentStepId", dw.getCurrentStepId());
            m.put("startedAt", dw.getStartedAt());
            wfRepo.findById(dw.getWorkflowId()).ifPresent(wf -> {
                m.put("workflowName", wf.getName());
                m.put("steps", stepRepo.findByWorkflowIdOrderByStepOrder(wf.getId()));
            });
            m.put("log", logRepo.findByDeliverableWorkflowIdOrderByActionAtDesc(dw.getId()));
            result.add(m);
        }
        return result;
    }

    @PostMapping("/{id}/workflows")
    public ResponseEntity<?> addWorkflow(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        if (!body.containsKey("workflowId")) return ResponseEntity.badRequest().body("workflowId required");
        Long workflowId = Long.valueOf(body.get("workflowId").toString());

        DeliverableWorkflow dw = new DeliverableWorkflow();
        dw.setDeliverableId(id);
        dw.setWorkflowId(workflowId);

        List<WorkflowStep> steps = stepRepo.findByWorkflowIdOrderByStepOrder(workflowId);
        if (!steps.isEmpty()) dw.setCurrentStepId(steps.get(0).getId());

        DeliverableWorkflow saved = dwRepo.save(dw);

        // Log START action
        if (!steps.isEmpty()) {
            DeliverableWorkflowLog log = new DeliverableWorkflowLog();
            log.setDeliverableWorkflowId(saved.getId());
            log.setStepId(steps.get(0).getId());
            log.setAction("START");
            if (body.containsKey("actionBy") && body.get("actionBy") != null)
                log.setActionBy(Long.valueOf(body.get("actionBy").toString()));
            logRepo.save(log);
        }
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/workflows/{dwId}")
    public ResponseEntity<?> removeWorkflow(@PathVariable Long dwId) {
        return dwRepo.findById(dwId).map(dw -> {
            dwRepo.delete(dw);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/workflows/{dwId}/advance")
    public ResponseEntity<?> advanceWorkflow(@PathVariable Long dwId, @RequestBody Map<String, Object> body) {
        return dwRepo.findById(dwId).map(dw -> {
            String action = (String) body.get("action"); // APPROVE or REJECT
            String comments = body.containsKey("comments") ? (String) body.get("comments") : "";

            // Record action in log
            DeliverableWorkflowLog log = new DeliverableWorkflowLog();
            log.setDeliverableWorkflowId(dwId);
            log.setStepId(dw.getCurrentStepId());
            log.setAction(action);
            log.setComments(comments);
            if (body.containsKey("actionBy") && body.get("actionBy") != null)
                log.setActionBy(Long.valueOf(body.get("actionBy").toString()));
            logRepo.save(log);

            // If APPROVE, advance to the next step
            if ("APPROVE".equals(action) && dw.getCurrentStepId() != null) {
                List<WorkflowStep> steps = stepRepo.findByWorkflowIdOrderByStepOrder(dw.getWorkflowId());
                int idx = -1;
                for (int i = 0; i < steps.size(); i++) {
                    if (steps.get(i).getId().equals(dw.getCurrentStepId())) { idx = i; break; }
                }
                // Move to next step, or null if last step completed
                dw.setCurrentStepId(idx >= 0 && idx < steps.size() - 1 ? steps.get(idx + 1).getId() : null);
                dwRepo.save(dw);
            }
            return ResponseEntity.ok(dw);
        }).orElse(ResponseEntity.notFound().build());
    }
}
