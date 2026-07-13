package mg.newapp.newapp.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class JourFerieDto {

    private Long id;

    @NotBlank(message = "Le libellé est obligatoire")
    private String libelle;

    @NotNull(message = "La date est obligatoire")
    private LocalDate dateFerie;

    private Boolean recurrent = false;

    // ── Getters / Setters ─────────────────────────────────
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }

    public LocalDate getDateFerie() { return dateFerie; }
    public void setDateFerie(LocalDate dateFerie) { this.dateFerie = dateFerie; }

    public Boolean getRecurrent() { return recurrent; }
    public void setRecurrent(Boolean recurrent) { this.recurrent = recurrent; }
}