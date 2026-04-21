# Deliverable Management — Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add Deliverable management — typed deliverables with custom fields, multi-workflow approval, cross-activity linking, and Where Used traceability.

**Architecture:** 9 new PostgreSQL tables (v5 migration pre-written). Backend: Entity→Repository→Controller (no Service layer). Frontend: React/TSX following existing patterns.

**Tech Stack:** Spring Boot 3 / JPA / PostgreSQL · React 18 / TypeScript · react-select · lucide-react

---

## Task 1: Run DB Migration

**Files:** `docs/sql/v5_deliverables_postgresql.sql` (already written)

**Step 1:** Execute migration against PostgreSQL:
```bash
psql -U <user> -d <dbname> -f docs/sql/v5_deliverables_postgresql.sql
```

**Step 2:** Verify 9 new tables exist:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'pms_%' AND table_name LIKE '%deliverab%'
   OR table_name LIKE 'pms_workflow%';
```

**Step 3:** Commit
```bash
git add docs/sql/v5_deliverables_postgresql.sql docs/plans/
git commit -m "feat: add v5 deliverable management DB schema and plans"
```

---

## Task 2: Backend Entities

**Files — Create (9 files in `src/main/java/com/pms/entity/`):**
`DeliverableType.java`, `DeliverableTypeField.java`, `Workflow.java`, `WorkflowStep.java`,
`Deliverable.java`, `DeliverableFieldValue.java`, `ActivityDeliverable.java`,
`DeliverableWorkflow.java`, `DeliverableWorkflowLog.java`

**Step 1:** Create `DeliverableType.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name = "pms_deliverable_types")
public class DeliverableType {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) private String name;
    @Column(length = 500) private String description;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { this.createdAt = LocalDateTime.now(); }
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getName() { return name; } public void setName(String n) { this.name = n; }
    public String getDescription() { return description; } public void setDescription(String d) { this.description = d; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
```

**Step 2:** Create `DeliverableTypeField.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;

@Entity @Table(name = "pms_deliverable_type_fields")
public class DeliverableTypeField {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "type_id", nullable = false) private Long typeId;
    @Column(name = "field_name", nullable = false, length = 100) private String fieldName;
    @Column(name = "field_type", length = 20) private String fieldType = "TEXT";
    @Column(name = "field_options", columnDefinition = "TEXT") private String fieldOptions;
    @Column(name = "field_order") private Integer fieldOrder = 0;
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public Long getTypeId() { return typeId; } public void setTypeId(Long t) { this.typeId = t; }
    public String getFieldName() { return fieldName; } public void setFieldName(String f) { this.fieldName = f; }
    public String getFieldType() { return fieldType; } public void setFieldType(String f) { this.fieldType = f; }
    public String getFieldOptions() { return fieldOptions; } public void setFieldOptions(String f) { this.fieldOptions = f; }
    public Integer getFieldOrder() { return fieldOrder; } public void setFieldOrder(Integer o) { this.fieldOrder = o; }
}
```

**Step 3:** Create `Workflow.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name = "pms_workflows")
public class Workflow {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 100) private String name;
    @Column(length = 500) private String description;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { this.createdAt = LocalDateTime.now(); }
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getName() { return name; } public void setName(String n) { this.name = n; }
    public String getDescription() { return description; } public void setDescription(String d) { this.description = d; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
```

**Step 4:** Create `WorkflowStep.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;

@Entity @Table(name = "pms_workflow_steps")
public class WorkflowStep {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "workflow_id", nullable = false) private Long workflowId;
    @Column(name = "step_name", nullable = false, length = 100) private String stepName;
    @Column(name = "step_order") private Integer stepOrder = 1;
    @Column(length = 500) private String description;
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public Long getWorkflowId() { return workflowId; } public void setWorkflowId(Long w) { this.workflowId = w; }
    public String getStepName() { return stepName; } public void setStepName(String s) { this.stepName = s; }
    public Integer getStepOrder() { return stepOrder; } public void setStepOrder(Integer o) { this.stepOrder = o; }
    public String getDescription() { return description; } public void setDescription(String d) { this.description = d; }
}
```

**Step 5:** Create `Deliverable.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name = "pms_deliverables")
public class Deliverable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 200) private String name;
    @Column(name = "type_id") private Long typeId;
    @Column(columnDefinition = "TEXT") private String description;
    @Column(name = "created_by") private Long createdBy;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { this.createdAt = LocalDateTime.now(); }
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getName() { return name; } public void setName(String n) { this.name = n; }
    public Long getTypeId() { return typeId; } public void setTypeId(Long t) { this.typeId = t; }
    public String getDescription() { return description; } public void setDescription(String d) { this.description = d; }
    public Long getCreatedBy() { return createdBy; } public void setCreatedBy(Long c) { this.createdBy = c; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
```

**Step 6:** Create `DeliverableFieldValue.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;

@Entity @Table(name = "pms_deliverable_field_values",
    uniqueConstraints = @UniqueConstraint(columnNames = {"deliverable_id","field_def_id"}))
public class DeliverableFieldValue {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "deliverable_id", nullable = false) private Long deliverableId;
    @Column(name = "field_def_id", nullable = false) private Long fieldDefId;
    @Column(columnDefinition = "TEXT") private String fieldValue;
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public Long getDeliverableId() { return deliverableId; } public void setDeliverableId(Long d) { this.deliverableId = d; }
    public Long getFieldDefId() { return fieldDefId; } public void setFieldDefId(Long f) { this.fieldDefId = f; }
    public String getFieldValue() { return fieldValue; } public void setFieldValue(String v) { this.fieldValue = v; }
}
```

**Step 7:** Create `ActivityDeliverable.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name = "pms_activity_deliverables",
    uniqueConstraints = @UniqueConstraint(columnNames = {"target_type","target_id","deliverable_id"}))
public class ActivityDeliverable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "target_type", nullable = false, length = 20) private String targetType;
    @Column(name = "target_id", nullable = false, length = 100) private String targetId;
    @Column(name = "deliverable_id", nullable = false) private Long deliverableId;
    @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @PrePersist protected void onCreate() { this.createdAt = LocalDateTime.now(); }
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public String getTargetType() { return targetType; } public void setTargetType(String t) { this.targetType = t; }
    public String getTargetId() { return targetId; } public void setTargetId(String t) { this.targetId = t; }
    public Long getDeliverableId() { return deliverableId; } public void setDeliverableId(Long d) { this.deliverableId = d; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
```

**Step 8:** Create `DeliverableWorkflow.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name = "pms_deliverable_workflows",
    uniqueConstraints = @UniqueConstraint(columnNames = {"deliverable_id","workflow_id"}))
public class DeliverableWorkflow {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "deliverable_id", nullable = false) private Long deliverableId;
    @Column(name = "workflow_id", nullable = false) private Long workflowId;
    @Column(name = "current_step_id") private Long currentStepId;
    @Column(name = "started_at", updatable = false) private LocalDateTime startedAt;
    @PrePersist protected void onCreate() { this.startedAt = LocalDateTime.now(); }
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public Long getDeliverableId() { return deliverableId; } public void setDeliverableId(Long d) { this.deliverableId = d; }
    public Long getWorkflowId() { return workflowId; } public void setWorkflowId(Long w) { this.workflowId = w; }
    public Long getCurrentStepId() { return currentStepId; } public void setCurrentStepId(Long s) { this.currentStepId = s; }
    public LocalDateTime getStartedAt() { return startedAt; }
}
```

**Step 9:** Create `DeliverableWorkflowLog.java`:
```java
package com.pms.entity;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity @Table(name = "pms_deliverable_workflow_log")
public class DeliverableWorkflowLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "deliverable_workflow_id", nullable = false) private Long deliverableWorkflowId;
    @Column(name = "step_id") private Long stepId;
    @Column(nullable = false, length = 20) private String action;
    @Column(name = "action_by") private Long actionBy;
    @Column(name = "action_at") private LocalDateTime actionAt;
    @Column(length = 1000) private String comments;
    @PrePersist protected void onCreate() { this.actionAt = LocalDateTime.now(); }
    public Long getId() { return id; } public void setId(Long id) { this.id = id; }
    public Long getDeliverableWorkflowId() { return deliverableWorkflowId; } public void setDeliverableWorkflowId(Long d) { this.deliverableWorkflowId = d; }
    public Long getStepId() { return stepId; } public void setStepId(Long s) { this.stepId = s; }
    public String getAction() { return action; } public void setAction(String a) { this.action = a; }
    public Long getActionBy() { return actionBy; } public void setActionBy(Long u) { this.actionBy = u; }
    public LocalDateTime getActionAt() { return actionAt; }
    public String getComments() { return comments; } public void setComments(String c) { this.comments = c; }
}
```

**Step 10:** Commit
```bash
git add src/main/java/com/pms/entity/
git commit -m "feat: add deliverable management JPA entities"
```

---

## Task 3: Backend Repositories

**Files — Create (9 files in `src/main/java/com/pms/repository/`):**

```java
// DeliverableTypeRepository.java
package com.pms.repository;
import com.pms.entity.DeliverableType;
import org.springframework.data.jpa.repository.JpaRepository;
public interface DeliverableTypeRepository extends JpaRepository<DeliverableType, Long> {}

// DeliverableTypeFieldRepository.java
package com.pms.repository;
import com.pms.entity.DeliverableTypeField;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliverableTypeFieldRepository extends JpaRepository<DeliverableTypeField, Long> {
    List<DeliverableTypeField> findByTypeIdOrderByFieldOrder(Long typeId);
    void deleteByTypeId(Long typeId);
}

// WorkflowRepository.java
package com.pms.repository;
import com.pms.entity.Workflow;
import org.springframework.data.jpa.repository.JpaRepository;
public interface WorkflowRepository extends JpaRepository<Workflow, Long> {}

// WorkflowStepRepository.java
package com.pms.repository;
import com.pms.entity.WorkflowStep;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface WorkflowStepRepository extends JpaRepository<WorkflowStep, Long> {
    List<WorkflowStep> findByWorkflowIdOrderByStepOrder(Long workflowId);
    void deleteByWorkflowId(Long workflowId);
}

// DeliverableRepository.java
package com.pms.repository;
import com.pms.entity.Deliverable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface DeliverableRepository extends JpaRepository<Deliverable, Long> {
    @Query("SELECT d FROM Deliverable d WHERE LOWER(d.name) LIKE LOWER(CONCAT('%',:kw,'%'))")
    List<Deliverable> searchByKeyword(@Param("kw") String keyword);
}

// DeliverableFieldValueRepository.java
package com.pms.repository;
import com.pms.entity.DeliverableFieldValue;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliverableFieldValueRepository extends JpaRepository<DeliverableFieldValue, Long> {
    List<DeliverableFieldValue> findByDeliverableId(Long deliverableId);
    void deleteByDeliverableId(Long deliverableId);
}

// ActivityDeliverableRepository.java
package com.pms.repository;
import com.pms.entity.ActivityDeliverable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface ActivityDeliverableRepository extends JpaRepository<ActivityDeliverable, Long> {
    List<ActivityDeliverable> findByTargetTypeAndTargetId(String targetType, String targetId);
    List<ActivityDeliverable> findByDeliverableId(Long deliverableId);
    boolean existsByTargetTypeAndTargetIdAndDeliverableId(String tt, String tid, Long did);
}

// DeliverableWorkflowRepository.java
package com.pms.repository;
import com.pms.entity.DeliverableWorkflow;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliverableWorkflowRepository extends JpaRepository<DeliverableWorkflow, Long> {
    List<DeliverableWorkflow> findByDeliverableId(Long deliverableId);
    void deleteByDeliverableId(Long deliverableId);
}

// DeliverableWorkflowLogRepository.java
package com.pms.repository;
import com.pms.entity.DeliverableWorkflowLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface DeliverableWorkflowLogRepository extends JpaRepository<DeliverableWorkflowLog, Long> {
    List<DeliverableWorkflowLog> findByDeliverableWorkflowIdOrderByActionAtDesc(Long dwId);
}
```

**Step 2:** Commit
```bash
git add src/main/java/com/pms/repository/
git commit -m "feat: add deliverable management repositories"
```

---

## Task 4: Backend Controllers

**Files — Create (4 files in `src/main/java/com/pms/controller/`):**

### 4a. `DeliverableTypeController.java`
```java
package com.pms.controller;
import com.pms.entity.*;
import com.pms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/deliverable-types") @CrossOrigin(origins = "*")
public class DeliverableTypeController {
    @Autowired private DeliverableTypeRepository typeRepo;
    @Autowired private DeliverableTypeFieldRepository fieldRepo;

    @GetMapping public List<DeliverableType> getAll() { return typeRepo.findAll(); }
    @PostMapping public DeliverableType create(@RequestBody DeliverableType t) { return typeRepo.save(t); }
    @PutMapping("/{id}") public ResponseEntity<?> update(@PathVariable Long id, @RequestBody DeliverableType t) {
        return typeRepo.findById(id).map(ex -> { ex.setName(t.getName()); ex.setDescription(t.getDescription()); return ResponseEntity.ok(typeRepo.save(ex)); }).orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}") public ResponseEntity<?> delete(@PathVariable Long id) {
        return typeRepo.findById(id).map(t -> { fieldRepo.deleteByTypeId(id); typeRepo.delete(t); return ResponseEntity.ok().build(); }).orElse(ResponseEntity.notFound().build());
    }
    @GetMapping("/{typeId}/fields") public List<DeliverableTypeField> getFields(@PathVariable Long typeId) {
        return fieldRepo.findByTypeIdOrderByFieldOrder(typeId);
    }
    @PostMapping("/{typeId}/fields") public DeliverableTypeField addField(@PathVariable Long typeId, @RequestBody DeliverableTypeField f) {
        f.setTypeId(typeId); return fieldRepo.save(f);
    }
    @DeleteMapping("/fields/{fieldId}") public ResponseEntity<?> deleteField(@PathVariable Long fieldId) {
        return fieldRepo.findById(fieldId).map(f -> { fieldRepo.delete(f); return ResponseEntity.ok().build(); }).orElse(ResponseEntity.notFound().build());
    }
}
```

### 4b. `WorkflowController.java`
```java
package com.pms.controller;
import com.pms.entity.*;
import com.pms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/workflows") @CrossOrigin(origins = "*")
public class WorkflowController {
    @Autowired private WorkflowRepository wfRepo;
    @Autowired private WorkflowStepRepository stepRepo;

    @GetMapping public List<Map<String,Object>> getAll() {
        List<Map<String,Object>> result = new ArrayList<>();
        for (Workflow w : wfRepo.findAll()) {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("id", w.getId()); m.put("name", w.getName());
            m.put("description", w.getDescription()); m.put("createdAt", w.getCreatedAt());
            m.put("steps", stepRepo.findByWorkflowIdOrderByStepOrder(w.getId()));
            result.add(m);
        }
        return result;
    }
    @PostMapping public Workflow create(@RequestBody Workflow w) { return wfRepo.save(w); }
    @PutMapping("/{id}") public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Workflow w) {
        return wfRepo.findById(id).map(ex -> { ex.setName(w.getName()); ex.setDescription(w.getDescription()); return ResponseEntity.ok(wfRepo.save(ex)); }).orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/{id}") public ResponseEntity<?> delete(@PathVariable Long id) {
        return wfRepo.findById(id).map(w -> { stepRepo.deleteByWorkflowId(id); wfRepo.delete(w); return ResponseEntity.ok().build(); }).orElse(ResponseEntity.notFound().build());
    }
    @PostMapping("/{wfId}/steps") public WorkflowStep addStep(@PathVariable Long wfId, @RequestBody WorkflowStep s) {
        s.setWorkflowId(wfId); return stepRepo.save(s);
    }
    @PutMapping("/steps/{stepId}") public ResponseEntity<?> updateStep(@PathVariable Long stepId, @RequestBody WorkflowStep s) {
        return stepRepo.findById(stepId).map(ex -> { ex.setStepName(s.getStepName()); ex.setStepOrder(s.getStepOrder()); ex.setDescription(s.getDescription()); return ResponseEntity.ok(stepRepo.save(ex)); }).orElse(ResponseEntity.notFound().build());
    }
    @DeleteMapping("/steps/{stepId}") public ResponseEntity<?> deleteStep(@PathVariable Long stepId) {
        return stepRepo.findById(stepId).map(s -> { stepRepo.delete(s); return ResponseEntity.ok().build(); }).orElse(ResponseEntity.notFound().build());
    }
}
```

### 4c. `ActivityDeliverableController.java`
```java
package com.pms.controller;
import com.pms.entity.ActivityDeliverable;
import com.pms.repository.ActivityDeliverableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController @RequestMapping("/api/activity-deliverables") @CrossOrigin(origins = "*")
public class ActivityDeliverableController {
    @Autowired private ActivityDeliverableRepository repo;

    @GetMapping public List<ActivityDeliverable> get(@RequestParam String targetType, @RequestParam String targetId) {
        return repo.findByTargetTypeAndTargetId(targetType, targetId);
    }
    @PostMapping public ResponseEntity<?> link(@RequestBody ActivityDeliverable ad) {
        if (repo.existsByTargetTypeAndTargetIdAndDeliverableId(ad.getTargetType(), ad.getTargetId(), ad.getDeliverableId()))
            return ResponseEntity.badRequest().body("Already linked");
        return ResponseEntity.ok(repo.save(ad));
    }
    @DeleteMapping("/{id}") public ResponseEntity<?> unlink(@PathVariable Long id) {
        return repo.findById(id).map(ad -> { repo.delete(ad); return ResponseEntity.ok().build(); }).orElse(ResponseEntity.notFound().build());
    }
}
```

### 4d. `DeliverableController.java`
```java
package com.pms.controller;
import com.pms.entity.*;
import com.pms.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController @RequestMapping("/api/deliverables") @CrossOrigin(origins = "*")
public class DeliverableController {
    @Autowired private DeliverableRepository delRepo;
    @Autowired private DeliverableFieldValueRepository fvRepo;
    @Autowired private DeliverableWorkflowRepository dwRepo;
    @Autowired private DeliverableWorkflowLogRepository logRepo;
    @Autowired private WorkflowRepository wfRepo;
    @Autowired private WorkflowStepRepository stepRepo;
    @Autowired private ActivityDeliverableRepository adRepo;

    @GetMapping public List<Deliverable> search(@RequestParam(required = false) String keyword) {
        return (keyword != null && !keyword.isBlank()) ? delRepo.searchByKeyword(keyword) : delRepo.findAll();
    }

    @GetMapping("/{id}") public ResponseEntity<?> getById(@PathVariable Long id) {
        return delRepo.findById(id).map(d -> {
            Map<String,Object> r = new LinkedHashMap<>();
            r.put("id", d.getId()); r.put("name", d.getName()); r.put("typeId", d.getTypeId());
            r.put("description", d.getDescription()); r.put("createdBy", d.getCreatedBy());
            r.put("createdAt", d.getCreatedAt()); r.put("fieldValues", fvRepo.findByDeliverableId(id));
            return ResponseEntity.ok(r);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping public Deliverable create(@RequestBody Deliverable d) { return delRepo.save(d); }

    @PutMapping("/{id}") public ResponseEntity<?> update(@PathVariable Long id, @RequestBody Map<String,Object> body) {
        return delRepo.findById(id).map(d -> {
            if (body.containsKey("name")) d.setName((String) body.get("name"));
            if (body.containsKey("description")) d.setDescription((String) body.get("description"));
            if (body.containsKey("typeId") && body.get("typeId") != null) d.setTypeId(Long.valueOf(body.get("typeId").toString()));
            delRepo.save(d);
            if (body.containsKey("fieldValues")) {
                @SuppressWarnings("unchecked") List<Map<String,Object>> fvList = (List<Map<String,Object>>) body.get("fieldValues");
                fvRepo.deleteByDeliverableId(id);
                for (Map<String,Object> fv : fvList) {
                    DeliverableFieldValue v = new DeliverableFieldValue();
                    v.setDeliverableId(id); v.setFieldDefId(Long.valueOf(fv.get("fieldDefId").toString())); v.setFieldValue((String) fv.get("fieldValue"));
                    fvRepo.save(v);
                }
            }
            return ResponseEntity.ok(d);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}") public ResponseEntity<?> delete(@PathVariable Long id) {
        return delRepo.findById(id).map(d -> { fvRepo.deleteByDeliverableId(id); dwRepo.deleteByDeliverableId(id); delRepo.delete(d); return ResponseEntity.ok().build(); }).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}/where-used") public List<ActivityDeliverable> whereUsed(@PathVariable Long id) {
        return adRepo.findByDeliverableId(id);
    }

    @GetMapping("/{id}/workflows") public List<Map<String,Object>> getWorkflows(@PathVariable Long id) {
        List<Map<String,Object>> result = new ArrayList<>();
        for (DeliverableWorkflow dw : dwRepo.findByDeliverableId(id)) {
            Map<String,Object> m = new LinkedHashMap<>();
            m.put("id", dw.getId()); m.put("deliverableId", dw.getDeliverableId());
            m.put("workflowId", dw.getWorkflowId()); m.put("currentStepId", dw.getCurrentStepId());
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

    @PostMapping("/{id}/workflows") public ResponseEntity<?> addWorkflow(@PathVariable Long id, @RequestBody Map<String,Object> body) {
        Long workflowId = Long.valueOf(body.get("workflowId").toString());
        DeliverableWorkflow dw = new DeliverableWorkflow();
        dw.setDeliverableId(id); dw.setWorkflowId(workflowId);
        List<WorkflowStep> steps = stepRepo.findByWorkflowIdOrderByStepOrder(workflowId);
        if (!steps.isEmpty()) dw.setCurrentStepId(steps.get(0).getId());
        DeliverableWorkflow saved = dwRepo.save(dw);
        if (!steps.isEmpty()) {
            DeliverableWorkflowLog log = new DeliverableWorkflowLog();
            log.setDeliverableWorkflowId(saved.getId()); log.setStepId(steps.get(0).getId()); log.setAction("START");
            if (body.containsKey("actionBy")) log.setActionBy(Long.valueOf(body.get("actionBy").toString()));
            logRepo.save(log);
        }
        return ResponseEntity.ok(saved);
    }

    @DeleteMapping("/workflows/{dwId}") public ResponseEntity<?> removeWorkflow(@PathVariable Long dwId) {
        return dwRepo.findById(dwId).map(dw -> { dwRepo.delete(dw); return ResponseEntity.ok().build(); }).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/workflows/{dwId}/advance") public ResponseEntity<?> advanceWorkflow(@PathVariable Long dwId, @RequestBody Map<String,Object> body) {
        return dwRepo.findById(dwId).map(dw -> {
            String action = (String) body.get("action");
            DeliverableWorkflowLog log = new DeliverableWorkflowLog();
            log.setDeliverableWorkflowId(dwId); log.setStepId(dw.getCurrentStepId()); log.setAction(action);
            log.setComments((String) body.getOrDefault("comments", ""));
            if (body.containsKey("actionBy")) log.setActionBy(Long.valueOf(body.get("actionBy").toString()));
            logRepo.save(log);
            if ("APPROVE".equals(action) && dw.getCurrentStepId() != null) {
                List<WorkflowStep> steps = stepRepo.findByWorkflowIdOrderByStepOrder(dw.getWorkflowId());
                int idx = -1;
                for (int i = 0; i < steps.size(); i++) if (steps.get(i).getId().equals(dw.getCurrentStepId())) { idx = i; break; }
                dw.setCurrentStepId(idx >= 0 && idx < steps.size() - 1 ? steps.get(idx + 1).getId() : null);
                dwRepo.save(dw);
            }
            return ResponseEntity.ok(dw);
        }).orElse(ResponseEntity.notFound().build());
    }
}
```

**Step 2:** Restart backend, verify:
```bash
curl http://localhost:8080/PMP/api/deliverable-types  # expect []
curl http://localhost:8080/PMP/api/workflows           # expect []
curl http://localhost:8080/PMP/api/deliverables        # expect []
```

**Step 3:** Commit
```bash
git add src/main/java/com/pms/controller/
git commit -m "feat: add deliverable management API controllers"
```

---

## Task 5: Frontend — Workflow Management Page

**Files — Create:** `frontend/src/pages/WorkflowManagement.tsx`
**Files — Modify:** `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`

**Step 1:** Create `WorkflowManagement.tsx` with split-panel layout:

- Left panel (w-72): Workflow list + `[+ New Workflow]` button. Click a row → select it.
- Right panel (flex-1): If selected, show editable name/description + `[Save]` + `[Delete Workflow]`. Below: ordered step list. Each step row: step_name input, up/down buttons, delete. `[+ Add Step]` at bottom.

Key functions needed:
```tsx
const BASE = (import.meta as any).env.BASE_URL;
fetchWorkflows()    → GET BASE+'api/workflows'
createWorkflow()    → POST BASE+'api/workflows'
updateWorkflow()    → PUT  BASE+`api/workflows/${id}`
deleteWorkflow()    → DELETE BASE+`api/workflows/${id}`
addStep()           → POST BASE+`api/workflows/${wfId}/steps`
updateStep()        → PUT  BASE+`api/workflow-steps/${stepId}`
deleteStep()        → DELETE BASE+`api/workflow-steps/${stepId}`
moveStep(up/down)   → swap stepOrder values, call updateStep for both
```

Style: white panels, indigo accents, same as RoleManagement.tsx pattern.

**Step 2:** In `App.tsx`, add:
```tsx
import WorkflowManagement from './pages/WorkflowManagement';
// In Routes:
<Route path="/workflows" element={<PrivateRoute><WorkflowManagement /></PrivateRoute>} />
```

**Step 3:** In `Sidebar.tsx`, add `GitBranch` to lucide import. In `isOwner &&` block after Roles `<li>`:
```tsx
<li>
  <button onClick={() => navigate('/workflows')}
    className={`w-full flex items-center h-10 px-3 rounded-xl transition-all ${isActive('/workflows') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
    <GitBranch className="w-5 h-5 shrink-0" />
    <span className={`ml-3 font-bold whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>Workflows</span>
  </button>
</li>
```

**Step 4:** Commit
```bash
git add frontend/src/pages/WorkflowManagement.tsx frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat: add Workflow Management page"
```

---

## Task 6: Frontend — Deliverable Types Page

**Files — Create:** `frontend/src/pages/DeliverableTypeManagement.tsx`
**Files — Modify:** `frontend/src/App.tsx`, `frontend/src/components/Sidebar.tsx`

**Step 1:** Same split-panel layout as WorkflowManagement:
- Left: Type list + `[+ New Type]`
- Right: editable name/desc + Fields editor table (field_name, field_type select, field_options for SELECT type, delete button per row) + `[+ Add Field]`

Key API calls:
```tsx
GET  BASE+'api/deliverable-types'
POST BASE+'api/deliverable-types'
PUT  BASE+`api/deliverable-types/${id}`
DELETE BASE+`api/deliverable-types/${id}`
GET  BASE+`api/deliverable-types/${typeId}/fields`
POST BASE+`api/deliverable-types/${typeId}/fields`
DELETE BASE+`api/deliverable-types/fields/${fieldId}`
```

**Step 2:** In `App.tsx`:
```tsx
import DeliverableTypeManagement from './pages/DeliverableTypeManagement';
<Route path="/deliverable-types" element={<PrivateRoute><DeliverableTypeManagement /></PrivateRoute>} />
```

**Step 3:** In `Sidebar.tsx`, add `Package` to lucide import. In `isOwner &&` block:
```tsx
<li>
  <button onClick={() => navigate('/deliverable-types')}
    className={`w-full flex items-center h-10 px-3 rounded-xl transition-all ${isActive('/deliverable-types') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}>
    <Package className="w-5 h-5 shrink-0" />
    <span className={`ml-3 font-bold whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>Deliverable Types</span>
  </button>
</li>
```

**Step 4:** Commit
```bash
git add frontend/src/pages/DeliverableTypeManagement.tsx frontend/src/App.tsx frontend/src/components/Sidebar.tsx
git commit -m "feat: add Deliverable Type Management page"
```

---

## Task 7: Frontend — DeliverableModal Component

**Files — Create:** `frontend/src/components/DeliverableModal.tsx`

**Step 1:** Define component interfaces at top of file:
```tsx
interface Props {
  deliverableId: number;
  onClose: () => void;
  allWorkflows: WFDef[];
  allTypes: DelType[];
}
interface WFDef { id: number; name: string; steps: WFStep[]; }
interface WFStep { id: number; stepName: string; stepOrder: number; }
interface DelType { id: number; name: string; }
interface TypeField { id: number; fieldName: string; fieldType: string; fieldOptions: string; }
interface FieldValue { id?: number; fieldDefId: number; fieldValue: string; }
interface DWF { id: number; workflowId: number; workflowName: string; currentStepId: number|null; steps: WFStep[]; log: LogEntry[]; }
interface LogEntry { id: number; stepId: number; action: string; actionAt: string; comments: string; }
interface WhereUsed { id: number; targetType: string; targetId: string; }
```

**Step 2:** Modal shell — full-screen overlay with centered white card:
```tsx
<div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b">
      <h2 className="font-black text-slate-800">{form.name || 'Deliverable'}</h2>
      <button onClick={onClose}><X className="w-5 h-5" /></button>
    </div>
    {/* Tab bar */}
    {/* Tab content */}
  </div>
</div>
```

**Step 3:** 4-tab implementation:

**Details tab:** Name input, description textarea, Type react-select. On typeId change, fetch type fields and render dynamically:
- `TEXT/NUMBER` → `<input type="text|number" />`
- `DATE` → `<input type="date" />`
- `SELECT` → `<select>` with options from `JSON.parse(field.fieldOptions)`

Save: PUT `api/deliverables/${id}` with `{ name, description, typeId, fieldValues: [{fieldDefId, fieldValue}] }`

**Workflow tab:** For each DWF entry:
```tsx
// Progress bubbles
{dw.steps.map((s, i) => (
  <div key={s.id} className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black
    ${isCompleted(s,dw) ? 'bg-indigo-600 text-white' :
      isCurrent(s,dw) ? 'bg-indigo-100 text-indigo-600 ring-2 ring-indigo-400' :
      'bg-slate-100 text-slate-400'}`}>{i+1}</div>
))}
// Action buttons (only show if currentStepId is not null)
<button onClick={() => advance(dw.id, 'APPROVE')} className="...">✓ Approve</button>
<button onClick={() => advance(dw.id, 'REJECT')} className="...">✗ Reject</button>
```

Add Workflow: react-select from `allWorkflows` + `[+ Attach]` button → POST `api/deliverables/${id}/workflows`

**Files tab:** Exact same pattern as TaskDetailView attachments tab, using `targetType="DELIVERABLE"`, `targetId={deliverableId}`

**Where Used tab:**
```tsx
{whereUsed.map(item => (
  <tr key={item.id} className="hover:bg-indigo-50">
    <td className="px-3 py-2 text-[10px] font-black text-slate-500">{item.targetType}</td>
    <td className="px-3 py-2">
      <button onClick={() => handleGoToWBS(item)} className="text-indigo-600 text-xs font-bold underline">
        {item.targetType} #{item.targetId}
      </button>
    </td>
  </tr>
))}
```

`handleGoToWBS`:
```tsx
const handleGoToWBS = async (item: WhereUsed) => {
  const BASE = (import.meta as any).env.BASE_URL;
  let pid = item.targetId;
  if (item.targetType === 'TASK') {
    const r = await fetch(BASE + `api/tasks/${item.targetId}`); const t = await r.json(); pid = String(t.projectId);
  } else if (item.targetType === 'PHASE') {
    pid = item.targetId.split('-')[0];
  }
  navigate(`/dashboard?projectId=${pid}`);
  onClose();
};
```
Note: `useNavigate` must be imported and called inside component.

**Step 4:** Commit
```bash
git add frontend/src/components/DeliverableModal.tsx
git commit -m "feat: add DeliverableModal with Details/Workflow/Files/WhereUsed tabs"
```

---

## Task 8: Frontend — Deliverables Tab in TaskDetailView

**Files — Modify:** `frontend/src/components/TaskDetailView.tsx`

**Step 1:** Add imports at top:
```tsx
import { Package } from 'lucide-react';
import DeliverableModal from './DeliverableModal';
```

**Step 2:** Add state variables after existing state:
```tsx
const [activityDeliverables, setActivityDeliverables] = useState<any[]>([]);
const [allWorkflows, setAllWorkflows] = useState<any[]>([]);
const [allDelTypes, setAllDelTypes] = useState<any[]>([]);
const [selectedDeliverableId, setSelectedDeliverableId] = useState<number|null>(null);
const [showDelModal, setShowDelModal] = useState(false);
const [showLinkSearch, setShowLinkSearch] = useState(false);
const [linkSearch, setLinkSearch] = useState('');
const [linkResults, setLinkResults] = useState<any[]>([]);
```

**Step 3:** In `fetchData()`, append after existing fetches:
```tsx
const BASE = (import.meta as any).env.BASE_URL;
const [adRes, wfRes, dtRes] = await Promise.all([
  fetch(BASE + `api/activity-deliverables?targetType=${targetType}&targetId=${targetId}`),
  fetch(BASE + 'api/workflows'),
  fetch(BASE + 'api/deliverable-types'),
]);
if (adRes.ok) setActivityDeliverables(await adRes.json());
if (wfRes.ok) setAllWorkflows(await wfRes.json());
if (dtRes.ok) setAllDelTypes(await dtRes.json());
```

**Step 4:** In `resetForm()`, add:
```tsx
setActivityDeliverables([]);
```

**Step 5:** Add Deliverables tab to the tab config array (after Files):
```tsx
{ id: 'deliverables', label: 'Deliverables', icon: Package }
```

**Step 6:** Add Deliverables tab content after the `attachments` tab block:
```tsx
{activeTab === 'deliverables' && (
  <div className="space-y-3">
    <div className="flex gap-2">
      <button onClick={handleCreateDeliverable} className="px-3 py-1 bg-indigo-600 text-white rounded text-[9px] font-black hover:bg-indigo-700">+ New</button>
      <button onClick={() => setShowLinkSearch(v => !v)} className="px-3 py-1 border border-indigo-300 text-indigo-600 rounded text-[9px] font-black hover:bg-indigo-50">+ Link</button>
    </div>
    {showLinkSearch && (
      <div className="border border-indigo-200 rounded-lg p-2 bg-white space-y-1">
        <input value={linkSearch} onChange={e => { setLinkSearch(e.target.value); handleSearchDeliverables(e.target.value); }}
          placeholder="Search deliverables..." className="w-full px-2 py-1 border border-gray-200 rounded text-xs" />
        {linkResults.map((d: any) => (
          <div key={d.id} className="flex justify-between items-center text-xs p-1 hover:bg-indigo-50 rounded">
            <span className="font-medium truncate">{d.name}</span>
            <button onClick={() => handleLinkDeliverable(d.id)} className="text-indigo-600 font-black text-[9px] ml-2 shrink-0">Link</button>
          </div>
        ))}
      </div>
    )}
    <div className="space-y-1">
      {activityDeliverables.map((ad: any) => (
        <div key={ad.id} className="flex items-center justify-between p-2 border border-slate-100 rounded-lg bg-slate-50/50 group hover:border-indigo-200">
          <button onClick={() => { setSelectedDeliverableId(ad.deliverableId); setShowDelModal(true); }}
            className="text-[11px] font-bold text-indigo-700 hover:underline text-left truncate">
            Deliverable #{ad.deliverableId}
          </button>
          <button onClick={() => handleUnlinkDeliverable(ad.id)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400">
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ))}
      {activityDeliverables.length === 0 && <p className="text-[10px] text-slate-400 text-center py-4">No deliverables linked.</p>}
    </div>
  </div>
)}
```

**Step 7:** Add handler functions before the return statement:
```tsx
const BASE_URL = (import.meta as any).env.BASE_URL;
const handleCreateDeliverable = async () => {
  const userJson = localStorage.getItem('currentUser');
  const userId = userJson ? JSON.parse(userJson).id : null;
  const res = await fetch(BASE_URL + 'api/deliverables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'New Deliverable', createdBy: userId }) });
  if (res.ok) {
    const d = await res.json();
    await fetch(BASE_URL + 'api/activity-deliverables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType, targetId: String(targetId), deliverableId: d.id }) });
    setSelectedDeliverableId(d.id); setShowDelModal(true); fetchData();
  }
};
const handleSearchDeliverables = async (kw: string) => {
  if (!kw.trim()) { setLinkResults([]); return; }
  const res = await fetch(BASE_URL + `api/deliverables?keyword=${encodeURIComponent(kw)}`);
  if (res.ok) setLinkResults(await res.json());
};
const handleLinkDeliverable = async (deliverableId: number) => {
  await fetch(BASE_URL + 'api/activity-deliverables', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetType, targetId: String(targetId), deliverableId }) });
  setShowLinkSearch(false); setLinkSearch(''); setLinkResults([]); fetchData();
};
const handleUnlinkDeliverable = async (adId: number) => {
  if (!confirm('Remove this deliverable link?')) return;
  await fetch(BASE_URL + `api/activity-deliverables/${adId}`, { method: 'DELETE' }); fetchData();
};
```

**Step 8:** Add modal at bottom of JSX return, before closing `</div>`:
```tsx
{showDelModal && selectedDeliverableId && (
  <DeliverableModal deliverableId={selectedDeliverableId} onClose={() => { setShowDelModal(false); setSelectedDeliverableId(null); fetchData(); }} allWorkflows={allWorkflows} allTypes={allDelTypes} />
)}
```

**Step 9:** Commit
```bash
git add frontend/src/components/TaskDetailView.tsx
git commit -m "feat: add Deliverables tab to activity detail panel"
```

---

## Task 9: Frontend — Dashboard URL Param Support (Where Used navigation)

**Files — Modify:** `frontend/src/pages/Dashboard.tsx`

**Step 1:** Add `useSearchParams` import:
```tsx
import { useSearchParams } from 'react-router-dom';
```

**Step 2:** Inside the Dashboard component, add:
```tsx
const [searchParams] = useSearchParams();
```

**Step 3:** Add a `useEffect` that triggers after projects are loaded:
```tsx
useEffect(() => {
  const pid = searchParams.get('projectId');
  if (pid && projects.length > 0) {
    const found = projects.find((p: any) => String(p.id) === pid);
    if (found) setSelectedProject(found);
  }
}, [searchParams, projects]);
```
Place after the existing useEffect that loads projects. Adjust `setSelectedProject` to match the actual state setter name in Dashboard.tsx.

**Step 4:** Commit
```bash
git add frontend/src/pages/Dashboard.tsx
git commit -m "feat: support projectId URL param for Where Used navigation"
```

---

## Task 10: End-to-End Verification

**Step 1:** Restart backend (`mvn spring-boot:run`) — check no startup errors.

**Step 2:** Verify all 9 tables were created:
```sql
SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'pms_%' ORDER BY table_name;
```

**Step 3:** Test Workflow Management page (`/workflows`):
- Create workflow "Standard Review" → add steps: Draft(1), Review(2), Approved(3) → verify save

**Step 4:** Test Deliverable Types page (`/deliverable-types`):
- Create type "Technical Report" → add fields: "Doc No" (TEXT), "Issue Date" (DATE) → verify save

**Step 5:** Test Deliverables in Activity Panel:
- Open Dashboard → select a project → click a Task in WBS → switch to Deliverables tab
- Click `[+ New]` → DeliverableModal opens → set name, pick type, fill custom fields → Save
- Switch to Workflow tab → add "Standard Review" → Approve step 1 → verify step 2 becomes current

**Step 6:** Test `[+ Link]` on another Task → search deliverable name → Link → verify it appears

**Step 7:** Test Where Used:
- Open DeliverableModal from Task #2 → Where Used tab → see both tasks listed → click link → Dashboard navigates to correct project

**Step 8:** Final commit
```bash
git add -A
git commit -m "feat: complete deliverable management - types, workflows, activity links, where-used"
```
