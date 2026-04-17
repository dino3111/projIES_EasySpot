package pt.ua.deti.apieasyspot.booking.service;

import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.booking.dto.FavoriteToggleResponse;
import pt.ua.deti.apieasyspot.booking.model.UserFavorite;
import pt.ua.deti.apieasyspot.booking.repository.UserFavoriteRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final UserRepository userRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final UserFavoriteRepository userFavoriteRepository;

    @Transactional
    public FavoriteToggleResponse toggle(String authentikUserId, UUID parkId){
        User user = findUser(authentikUserId);
        ParkingLot parkingLot = findPark(parkId);

        Optional<UserFavorite> existing = userFavoriteRepository.findByUserIdAndParkingLotId(user.getId(), parkingLot.getId());

        if(existing.isPresent()){
            userFavoriteRepository.delete(existing.get());
            return new FavoriteToggleResponse(parkId, false);
        }

        UserFavorite favorite = new UserFavorite();
        favorite.setUser(user);
        favorite.setParkingLot(parkingLot);
        userFavoriteRepository.save(favorite);

        return new FavoriteToggleResponse(parkId, true);
    }

    private User findUser(String authentikUserId) {
        return userRepository.findByAuthentikUserId(authentikUserId).orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    private ParkingLot findPark(UUID parkId) {
        return parkingLotRepository.findById(parkId).orElseThrow(()-> new ResourceNotFoundException("Parking not found: " + parkId));
    }
}
