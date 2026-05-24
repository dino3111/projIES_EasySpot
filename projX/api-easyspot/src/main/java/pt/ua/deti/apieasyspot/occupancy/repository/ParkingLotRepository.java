package pt.ua.deti.apieasyspot.occupancy.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, UUID> {

    @Query("""
        SELECT p FROM ParkingLot p
        WHERE p.status = pt.ua.deti.apieasyspot.occupancy.model.ParkStatus.ACTIVE
          AND (:textQuery IS NULL OR :textQuery = '' OR
               LOWER(p.name) LIKE LOWER(CONCAT('%', :textQuery, '%')) OR
               LOWER(p.city) LIKE LOWER(CONCAT('%', :textQuery, '%')) OR
               LOWER(p.address) LIKE LOWER(CONCAT('%', :textQuery, '%')))
          AND (:city IS NULL OR :city = '' OR LOWER(p.city) = LOWER(:city))
        ORDER BY p.name ASC
        """)
    List<ParkingLot> searchByTextAndCity(@Param("textQuery") String textQuery, @Param("city") String city);

    List<ParkingLot> findAllByOrderByNameAsc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ParkingLot p WHERE p.id = :id")
    Optional<ParkingLot> findByIdWithLock(@Param("id") UUID id);
}
