package pt.ua.deti.apieasyspot.booking.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FavoriteServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private ParkingLotRepository parkingLotRepository;
    @Mock private UserFavoriteRepository userFavoriteRepository;

    @InjectMocks private FavoriteService favoriteService;

    private User user;
    private ParkingLot parkingLot;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setAuthentikUserId("auth-sub-123");

        parkingLot = new ParkingLot();
        parkingLot.setId(UUID.randomUUID());
        parkingLot.setName("Parque Central");
        parkingLot.setCity("Aveiro");
    }

    @Test
    @DisplayName("toggle - not yet favorite - creates and returns isFavorite true")
    void toggle_notFavorite_addsAndReturnsTrue() {
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(parkingLotRepository.findById(parkingLot.getId())).thenReturn(Optional.of(parkingLot));
        when(userFavoriteRepository.findByUserIdAndParkingLotId(user.getId(), parkingLot.getId()))
            .thenReturn(Optional.empty());
        when(userFavoriteRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        FavoriteToggleResponse response = favoriteService.toggle("auth-sub-123", parkingLot.getId());

        assertThat(response.parkId()).isEqualTo(parkingLot.getId());
        assertThat(response.isFavorite()).isTrue();
        verify(userFavoriteRepository).save(any(UserFavorite.class));
    }

    @Test
    @DisplayName("toggle - already favorite - removes and returns isFavorite false")
    void toggle_alreadyFavorite_removesAndReturnsFalse() {
        UserFavorite existing = new UserFavorite();
        existing.setUser(user);
        existing.setParkingLot(parkingLot);

        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(parkingLotRepository.findById(parkingLot.getId())).thenReturn(Optional.of(parkingLot));
        when(userFavoriteRepository.findByUserIdAndParkingLotId(user.getId(), parkingLot.getId()))
            .thenReturn(Optional.of(existing));

        FavoriteToggleResponse response = favoriteService.toggle("auth-sub-123", parkingLot.getId());

        assertThat(response.parkId()).isEqualTo(parkingLot.getId());
        assertThat(response.isFavorite()).isFalse();
        verify(userFavoriteRepository).delete(existing);
        verify(userFavoriteRepository, never()).save(any());
    }

    @Test
    @DisplayName("toggle - user not found - throws ResourceNotFoundException")
    void toggle_userNotFound_throws() {
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> favoriteService.toggle("auth-sub-123", parkingLot.getId()))
            .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(parkingLotRepository, userFavoriteRepository);
    }

    @Test
    @DisplayName("toggle - park not found - throws ResourceNotFoundException")
    void toggle_parkNotFound_throws() {
        when(userRepository.findByAuthentikUserId("auth-sub-123")).thenReturn(Optional.of(user));
        when(parkingLotRepository.findById(parkingLot.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> favoriteService.toggle("auth-sub-123", parkingLot.getId()))
            .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(userFavoriteRepository);
    }
}
