package pt.ua.deti.apieasyspot.billing.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public interface ParkingSessionRepository extends JpaRepository<ParkingSession, UUID> {
    
    @Query("SELECT ps FROM ParkingSession ps WHERE ps.parkingLot.id = :parkingLotId AND ps.exitTime > :afterTime")
    List<ParkingSession> findActiveSessions(@Param("parkingLotId") UUID parkingLotId, @Param("afterTime") OffsetDateTime afterTime);
    
    @Query("SELECT COUNT(ps) FROM ParkingSession ps WHERE ps.parkingLot.id = :parkingLotId AND ps.exitTime > CURRENT_TIMESTAMP")
    long countActiveSessionsByParkingLot(@Param("parkingLotId") UUID parkingLotId);
}
