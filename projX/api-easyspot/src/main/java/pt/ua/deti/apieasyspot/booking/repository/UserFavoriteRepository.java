package pt.ua.deti.apieasyspot.booking.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.booking.model.UserFavorite;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;

import java.util.Optional;
import java.util.UUID;

public interface UserFavoriteRepository extends JpaRepository<UserFavorite, UUID> {

    Optional<UserFavorite> findByUserIdAndParkingLotId(UUID userId, UUID parkingLotId);
    boolean existsByUserIdAndParkingLotId(UUID userId, UUID parkingLotId);
}
