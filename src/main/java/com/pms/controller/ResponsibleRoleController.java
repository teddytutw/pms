package com.pms.controller;

import com.pms.entity.ResponsibleRole;
import com.pms.repository.ResponsibleRoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/responsible-roles")
@CrossOrigin(origins = "*")
public class ResponsibleRoleController {

    @Autowired
    private ResponsibleRoleRepository repository;

    @GetMapping
    public List<ResponsibleRole> getAll() {
        return repository.findAll();
    }

    @PostMapping
    public ResponsibleRole create(@RequestBody ResponsibleRole role) {
        return repository.save(role);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        return repository.findById(id).map(role -> {
            repository.delete(role);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
