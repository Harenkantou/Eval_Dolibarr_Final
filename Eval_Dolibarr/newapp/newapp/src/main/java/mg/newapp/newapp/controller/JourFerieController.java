package mg.newapp.newapp.controller;

import jakarta.validation.Valid;
import mg.newapp.newapp.dto.JourFerieDto;
import mg.newapp.newapp.entity.JourFerie;
import mg.newapp.newapp.repository.JourFerieRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/jours-feries")
public class JourFerieController {

    private final JourFerieRepository repository;

    public JourFerieController(JourFerieRepository repository) {
        this.repository = repository;
    }

    // ── LIST ──────────────────────────────────────────────
    @GetMapping
    public List<JourFerie> list() {
        return repository.findAll();
    }

    // ── GET BY ID ─────────────────────────────────────────
    @GetMapping("/{id}")
    public JourFerie getOne(@PathVariable Long id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Jour férié introuvable : " + id));
    }

    // ── CREATE ────────────────────────────────────────────
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public JourFerie create(@Valid @RequestBody JourFerieDto dto) {
        if (repository.existsByDateFerie(dto.getDateFerie())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Un jour férié existe déjà à cette date : " + dto.getDateFerie());
        }
        JourFerie entity = new JourFerie(
            dto.getLibelle(), dto.getDateFerie(), dto.getRecurrent());
        return repository.save(entity);
    }

    // ── UPDATE ────────────────────────────────────────────
    @PutMapping("/{id}")
    public JourFerie update(@PathVariable Long id, @Valid @RequestBody JourFerieDto dto) {
        JourFerie entity = repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Jour férié introuvable : " + id));

        // Vérifier collision de date uniquement si la date change
        if (!entity.getDateFerie().equals(dto.getDateFerie())
                && repository.existsByDateFerie(dto.getDateFerie())) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Un jour férié existe déjà à cette date : " + dto.getDateFerie());
        }

        entity.setLibelle(dto.getLibelle());
        entity.setDateFerie(dto.getDateFerie());
        entity.setRecurrent(dto.getRecurrent());
        return repository.save(entity);
    }

    // ── DELETE ────────────────────────────────────────────
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        if (!repository.existsById(id)) {
            throw new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Jour férié introuvable : " + id);
        }
        repository.deleteById(id);
    }

    // ── DELETE ALL (reset) ────────────────────────────────
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAll() {
        repository.deleteAll();
    }
}