package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface TariffRepository extends JpaRepository<Tariff, UUID> {
    List<Tariff> findByParkingLotId(UUID parkingLotId);

    Optional<Tariff> findFirstByParkingLotIdOrderByIdAsc(UUID parkingLotId);

    @Query("SELECT t FROM Tariff t JOIN t.parkingLot p WHERE " +
           "(:parkId IS NULL OR p.id = :parkId) AND " +
           "(:city IS NULL OR LOWER(p.city) LIKE CONCAT('%', :city, '%')) AND " +
           "(:status IS NULL OR t.status = :status)")
    Page<Tariff> findFiltered(
            @Param("parkId") UUID parkId,
            @Param("city") String city,
            @Param("status") TariffStatus status,
            Pageable pageable);
}
