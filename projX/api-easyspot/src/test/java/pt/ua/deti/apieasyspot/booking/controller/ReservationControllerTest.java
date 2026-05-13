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
import pt.ua.deti.apieasyspot.booking.dto.ReservationUpdatePreviewResponse;
import pt.ua.deti.apieasyspot.booking.dto.ReservationUpdateResponse;
import pt.ua.deti.apieasyspot.booking.dto.UpdateReservationRequest;
import pt.ua.deti.apieasyspot.booking.service.ReservationService;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.UnprocessableEntityException;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
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
    private UpdateReservationRequest updateRequest;
    private ReservationResponse confirmedResponse;
    private UUID reservationId;

    private static final String AUTH_ID = "auth-sub-456";

    @BeforeEach
    void setUp() {
        UUID parkId = UUID.randomUUID();
        UUID vehicleId = UUID.randomUUID();
        OffsetDateTime arrival = OffsetDateTime.now(ZoneOffset.UTC).plusHours(2);
        OffsetDateTime departure = arrival.plusHours(2);
        reservationId = UUID.randomUUID();

        validRequest = new CreateReservationRequest(
            parkId, vehicleId, arrival.toString(), departure.toString(), null);
        updateRequest = new UpdateReservationRequest(
            parkId, vehicleId, arrival.plusHours(1).toString(), departure.plusHours(1).toString(), null);

        confirmedResponse = new ReservationResponse(
            reservationId,
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
            .thenThrow(new UnprocessableEntityException("A data de chegada tem de ser no futuro."));

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

    @Test
    @DisplayName("listReservations - returns service payload")
    void listReservations_returnsPayload() {
        when(reservationService.list(AUTH_ID)).thenReturn(List.of(confirmedResponse));

        ResponseEntity<List<ReservationResponse>> response = reservationController.listReservations(jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).containsExactly(confirmedResponse);
        verify(reservationService).list(AUTH_ID);
    }

    @Test
    @DisplayName("getReservation - delegates to service with reservation id")
    void getReservation_delegatesToService() {
        when(reservationService.getById(AUTH_ID, reservationId)).thenReturn(confirmedResponse);

        ResponseEntity<ReservationResponse> response = reservationController.getReservation(reservationId, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(confirmedResponse);
        verify(reservationService).getById(AUTH_ID, reservationId);
    }

    @Test
    @DisplayName("previewUpdateReservation - valid request - returns 200 OK")
    void previewUpdateReservation_validRequest_returns200() {
        ReservationUpdatePreviewResponse previewResponse =
            new ReservationUpdatePreviewResponse(
                new BigDecimal("3.00"),
                new BigDecimal("4.50"),
                new BigDecimal("1.50")
            );
        when(reservationService.previewUpdate(AUTH_ID, reservationId, updateRequest)).thenReturn(previewResponse);

        ResponseEntity<ReservationUpdatePreviewResponse> response =
            reservationController.previewUpdateReservation(reservationId, updateRequest, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(previewResponse);
        verify(reservationService).previewUpdate(AUTH_ID, reservationId, updateRequest);
    }

    @Test
    @DisplayName("updateReservation - valid request - returns 200 OK")
    void updateReservation_validRequest_returns200() {
        ReservationUpdateResponse updateResponse =
            new ReservationUpdateResponse(
                confirmedResponse,
                java.math.BigDecimal.ZERO,
                java.math.BigDecimal.ZERO,
                java.math.BigDecimal.ZERO,
                "NO_CHANGE",
                null,
                null
            );
        when(reservationService.update(AUTH_ID, reservationId, updateRequest)).thenReturn(updateResponse);

        ResponseEntity<ReservationUpdateResponse> response =
            reservationController.updateReservation(reservationId, updateRequest, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(updateResponse);
        verify(reservationService).update(AUTH_ID, reservationId, updateRequest);
    }

    @Test
    @DisplayName("cancelReservation - valid reservation - returns 200 OK")
    void cancelReservation_validRequest_returns200() {
        when(reservationService.cancel(AUTH_ID, reservationId)).thenReturn(confirmedResponse);

        ResponseEntity<ReservationResponse> response =
            reservationController.cancelReservation(reservationId, jwt);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isEqualTo(confirmedResponse);
        verify(reservationService).cancel(AUTH_ID, reservationId);
    }
}
