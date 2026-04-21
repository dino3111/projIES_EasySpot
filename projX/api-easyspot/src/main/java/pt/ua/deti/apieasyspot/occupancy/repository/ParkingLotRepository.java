package pt.ua.deti.apieasyspot.occupancy.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;

import java.util.Optional;
import java.util.UUID;

public interface ParkingLotRepository extends JpaRepository<ParkingLot, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM ParkingLot p WHERE p.id = :id")
    Optional<ParkingLot> findByIdWithLock(@Param("id") UUID id);
}
