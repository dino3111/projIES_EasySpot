package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;

import java.util.List;
import java.util.UUID;

public interface TariffRepository extends JpaRepository<Tariff, UUID> {
    List<Tariff> findByParkingLotId(UUID parkingLotId);

    @Query("SELECT t FROM Tariff t JOIN t.parkingLot p WHERE " +
           "(:parkId IS NULL OR p.id = :parkId) AND " +
           "(:city IS NULL OR p.city ILIKE %:city%) AND " +
           "(:status IS NULL OR t.status = :status)")
    List<Tariff> findFiltered(
            @Param("parkId") UUID parkId,
            @Param("city") String city,
            @Param("status") TariffStatus status);
}
