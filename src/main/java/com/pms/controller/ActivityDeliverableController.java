package com.pms.controller;

import com.pms.entity.ActivityDeliverable;
import com.pms.repository.ActivityDeliverableRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/activity-deliverables")
@CrossOrigin(origins = "*")
public class ActivityDeliverableController {

    @Autowired private ActivityDeliverableRepository repo;

    @GetMapping
    public List<ActivityDeliverable> get(
            @RequestParam String targetType,
            @RequestParam String targetId) {
        return repo.findByTargetTypeAndTargetId(targetType, targetId);
    }

    @PostMapping
    public ResponseEntity<?> link(@RequestBody ActivityDeliverable ad) {
        if (repo.existsByTargetTypeAndTargetIdAndDeliverableId(
                ad.getTargetType(), ad.getTargetId(), ad.getDeliverableId())) {
            return ResponseEntity.badRequest().body("Already linked");
        }
        return ResponseEntity.ok(repo.save(ad));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> unlink(@PathVariable Long id) {
        return repo.findById(id).map(ad -> {
            repo.delete(ad);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
