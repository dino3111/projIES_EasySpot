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
import pt.ua.deti.apieasyspot.booking.dto.CreateReservationRequest;
import pt.ua.deti.apieasyspot.booking.dto.ReservationResponse;
import pt.ua.deti.apieasyspot.booking.service.ReservationService;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.UnprocessableEntityException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ReservationControllerTest {

    @Mock private ReservationService reservationService;
    @Mock private Jwt jwt;

    @InjectMocks private ReservationController reservationController;

    private CreateReservationRequest validRequest;
    private ReservationResponse confirmedResponse;

    private static final String AUTH_ID = "auth-sub-456";

    @BeforeEach
    void setUp() {
        UUID parkId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        OffsetDateTime arrival = OffsetDateTime.now(ZoneOffset.UTC).plusHours(2);
        OffsetDateTime departure = arrival.plusHours(2);

        validRequest = new CreateReservationRequest(
            parkId, vehicleId, arrival.toString(), departure.toString(), null);

        confirmedResponse = new ReservationResponse(
            UUID.randomUUID(),
            "ES-ABCD-1234",
            parkId,
            "Parque Central",
            "Rua de Aveiro 1",
            null, null,
            vehicleId,
            arrival, departure,
            "CONFIRMED",
            arrival.plusMinutes(30),
            new BigDecimal("3.00")
        );

        when(jwt.getSubject()).thenReturn(AUTH_ID);
    }

    @Test
    @DisplayName("createReservation - valid request - returns 201 CREATED")
    void createReservation_validRequest_returns201() {
        when(reservationService.create(AUTH_ID, null, validRequest)).thenReturn(confirmedResponse);

        ResponseEntity<ReservationResponse> response =
            reservationController.createReservation(validRequest, null, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isEqualTo(confirmedResponse);
        verify(reservationService).create(AUTH_ID, null, validRequest);
    }

    @Test
    @DisplayName("createReservation - idempotency key forwarded to service")
    void createReservation_withIdempotencyKey_forwardsKey() {
        when(reservationService.create(AUTH_ID, "key-123", validRequest)).thenReturn(confirmedResponse);

        ResponseEntity<ReservationResponse> response =
            reservationController.createReservation(validRequest, "key-123", jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        verify(reservationService).create(AUTH_ID, "key-123", validRequest);
    }

    @Test
    @DisplayName("createReservation - service throws ConflictException - propagates")
    void createReservation_conflict_propagatesException() {
        when(reservationService.create(any(), any(), any()))
            .thenThrow(new ConflictException("Lot fully booked"));

        assertThatThrownBy(() ->
            reservationController.createReservation(validRequest, null, jwt))
            .isInstanceOf(ConflictException.class)
            .hasMessageContaining("fully booked");
    }

    @Test
    @DisplayName("createReservation - service throws UnprocessableEntityException - propagates")
    void createReservation_invalidDate_propagatesException() {
        when(reservationService.create(any(), any(), any()))
            .thenThrow(new UnprocessableEntityException("arrivalDateTime must be in the future"));

        assertThatThrownBy(() ->
            reservationController.createReservation(validRequest, null, jwt))
            .isInstanceOf(UnprocessableEntityException.class);
    }

    @Test
    @DisplayName("createReservation - jwt subject extracted correctly")
    void createReservation_extractsSubjectFromJwt() {
        when(reservationService.create(AUTH_ID, null, validRequest)).thenReturn(confirmedResponse);

        reservationController.createReservation(validRequest, null, jwt);

        verify(jwt).getSubject();
        verify(reservationService).create(eq(AUTH_ID), any(), any());
    }
}
