package mg.newapp.newapp.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

@Entity
@Table(name = "jours_feries")
public class JourFerie {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Column(nullable = false)
    private String libelle;

    @NotNull
    @Column(name = "date_ferie", nullable = false, unique = true)
    private LocalDate dateFerie;

    @Column(nullable = false)
    private Boolean recurrent = false;

    // ── Constructeurs ─────────────────────────────────────
    public JourFerie() {}

    public JourFerie(String libelle, LocalDate dateFerie, Boolean recurrent) {
        this.libelle   = libelle;
        this.dateFerie = dateFerie;
        this.recurrent = recurrent != null ? recurrent : false;
    }

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