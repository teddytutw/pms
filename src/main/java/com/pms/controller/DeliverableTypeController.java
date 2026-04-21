package com.pms.controller;

import com.pms.entity.DeliverableType;
import com.pms.entity.DeliverableTypeField;
import com.pms.repository.DeliverableTypeFieldRepository;
import com.pms.repository.DeliverableTypeRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/deliverable-types")
@CrossOrigin(origins = "*")
public class DeliverableTypeController {

    @Autowired private DeliverableTypeRepository typeRepo;
    @Autowired private DeliverableTypeFieldRepository fieldRepo;

    @GetMapping
    public List<DeliverableType> getAll() {
        return typeRepo.findAll();
    }

    @PostMapping
    public DeliverableType create(@RequestBody DeliverableType t) {
        return typeRepo.save(t);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id, @RequestBody DeliverableType t) {
        return typeRepo.findById(id).map(ex -> {
            ex.setName(t.getName());
            ex.setDescription(t.getDescription());
            return ResponseEntity.ok(typeRepo.save(ex));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return typeRepo.findById(id).map(t -> {
            fieldRepo.deleteByTypeId(id);
            typeRepo.delete(t);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    // --- Field sub-resource ---

    @GetMapping("/{typeId}/fields")
    public List<DeliverableTypeField> getFields(@PathVariable Long typeId) {
        return fieldRepo.findByTypeIdOrderByFieldOrder(typeId);
    }

    @PostMapping("/{typeId}/fields")
    public DeliverableTypeField addField(@PathVariable Long typeId, @RequestBody DeliverableTypeField f) {
        f.setTypeId(typeId);
        return fieldRepo.save(f);
    }

    @PutMapping("/fields/{fieldId}")
    public ResponseEntity<?> updateField(@PathVariable Long fieldId, @RequestBody DeliverableTypeField f) {
        return fieldRepo.findById(fieldId).map(ex -> {
            ex.setFieldName(f.getFieldName());
            ex.setFieldType(f.getFieldType());
            ex.setFieldOptions(f.getFieldOptions());
            ex.setFieldOrder(f.getFieldOrder());
            return ResponseEntity.ok(fieldRepo.save(ex));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/fields/{fieldId}")
    public ResponseEntity<?> deleteField(@PathVariable Long fieldId) {
        return fieldRepo.findById(fieldId).map(f -> {
            fieldRepo.delete(f);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
