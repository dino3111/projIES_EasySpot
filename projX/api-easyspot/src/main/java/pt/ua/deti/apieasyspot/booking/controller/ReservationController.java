package pt.ua.deti.apieasyspot.booking.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.booking.dto.CreateReservationRequest;
import pt.ua.deti.apieasyspot.booking.dto.ReservationResponse;
import pt.ua.deti.apieasyspot.booking.service.ReservationService;

@Tag(name = "Reservations", description = "Parking spot reservation management")
@RestController
@RequestMapping("/api/reservations")
@RequiredArgsConstructor
public class ReservationController {

    private final ReservationService reservationService;

    @Operation(
        summary = "Create a parking reservation",
        description = """
            Reserves a parking spot for a driver. Enforces conflict detection, lot capacity,
            opening-hours validation and a 30-minute grace lock. Optionally supply an
            Idempotency-Key header to make the request safely retryable.
            """
    )
    @ApiResponse(responseCode = "201", description = "Reservation confirmed")
    @ApiResponse(responseCode = "400", description = "Validation error in request body")
    @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    @ApiResponse(responseCode = "403", description = "Caller is not a DRIVER")
    @ApiResponse(responseCode = "404", description = "Park, vehicle or spot not found")
    @ApiResponse(responseCode = "409", description = "Spot or lot unavailable / vehicle double-booking")
    @ApiResponse(responseCode = "422", description = "Invalid date range or off-hours booking")
    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ReservationResponse> createReservation(
        @Valid @RequestBody CreateReservationRequest request,
        @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
        @AuthenticationPrincipal Jwt jwt
    ) {
        String authentikUserId = jwt.getSubject();
        ReservationResponse response = reservationService.create(authentikUserId, idempotencyKey, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
