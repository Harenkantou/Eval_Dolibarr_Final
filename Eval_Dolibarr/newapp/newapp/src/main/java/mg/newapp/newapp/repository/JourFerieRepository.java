package mg.newapp.newapp.repository;

import mg.newapp.newapp.entity.JourFerie;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface JourFerieRepository extends JpaRepository<JourFerie, Long> {
    Optional<JourFerie> findByDateFerie(LocalDate dateFerie);
    boolean existsByDateFerie(LocalDate dateFerie);
}