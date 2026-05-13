package pt.ua.deti.apieasyspot.booking.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import pt.ua.deti.apieasyspot.booking.dto.FavoriteStatusResponse;
import pt.ua.deti.apieasyspot.booking.dto.FavoriteToggleResponse;
import pt.ua.deti.apieasyspot.booking.service.FavoriteService;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FavoriteControllerTest {

    @Mock private FavoriteService favoriteService;
    @Mock private Jwt jwt;

    @InjectMocks
    private FavoriteController favoriteController;

    private UUID parkId;

    @BeforeEach
    void setUp() {
        parkId = UUID.randomUUID();
        when(jwt.getSubject()).thenReturn("auth-sub-123");
    }

    @Test
    @DisplayName("getFavoriteStatus - calls service and returns 200 with status")
    void getFavoriteStatus_success() {
        FavoriteStatusResponse status = new FavoriteStatusResponse(parkId, true);
        when(favoriteService.getStatus("auth-sub-123", parkId)).thenReturn(status);

        ResponseEntity<FavoriteStatusResponse> response = favoriteController.getFavoriteStatus(parkId, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(status);
        verify(favoriteService).getStatus("auth-sub-123", parkId);
    }

    @Test
    @DisplayName("toggleFavorite - calls service and returns 200 with toggle result")
    void toggleFavorite_success() {
        FavoriteToggleResponse toggle = new FavoriteToggleResponse(parkId, true);
        when(favoriteService.toggle("auth-sub-123", parkId)).thenReturn(toggle);

        ResponseEntity<FavoriteToggleResponse> response = favoriteController.toggleFavorite(parkId, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(toggle);
        verify(favoriteService).toggle("auth-sub-123", parkId);
    }
}
