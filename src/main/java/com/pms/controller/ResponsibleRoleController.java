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
        @SuppressWarnings("null")
        ResponsibleRole savedRole = repository.save(role);
        return savedRole;
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable long id) {
        return repository.findById(id).map(role -> {
            @SuppressWarnings("null")
            var dummy = role; // suppress isn't easily placed on a statement only, so let's just annotate the variable, wait actually delete(role) is void.
            repository.delete(dummy);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
