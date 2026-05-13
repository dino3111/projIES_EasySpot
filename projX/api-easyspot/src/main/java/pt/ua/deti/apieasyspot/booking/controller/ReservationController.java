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
import pt.ua.deti.apieasyspot.booking.dto.UpdateReservationRequest;
import pt.ua.deti.apieasyspot.booking.dto.ReservationUpdateResponse;
import pt.ua.deti.apieasyspot.booking.dto.ReservationUpdatePreviewResponse;
import pt.ua.deti.apieasyspot.booking.service.ReservationService;

import java.util.List;
import java.util.UUID;

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

    @Operation(
        summary = "List driver reservations",
        description = "Returns every reservation owned by the authenticated driver, ordered by creation date descending."
    )
    @ApiResponse(responseCode = "200", description = "Reservations returned successfully")
    @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    @ApiResponse(responseCode = "403", description = "Caller is not a DRIVER")
    @GetMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<ReservationResponse>> listReservations(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(reservationService.list(jwt.getSubject()));
    }

    @Operation(
        summary = "Get reservation details",
        description = "Returns the details of a reservation owned by the authenticated driver."
    )
    @ApiResponse(responseCode = "200", description = "Reservation returned successfully")
    @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    @ApiResponse(responseCode = "403", description = "Caller is not a DRIVER")
    @ApiResponse(responseCode = "404", description = "Reservation not found for this driver")
    @GetMapping("/{reservationId}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ReservationResponse> getReservation(
        @PathVariable UUID reservationId,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(reservationService.getById(jwt.getSubject(), reservationId));
    }

    @Operation(
        summary = "Preview a reservation update",
        description = """
            Re-runs the validation and cost calculation for a proposed reservation update without
            persisting any change or contacting Stripe. Use it to show the user the new cost and the
            delta against the current cost before confirming.
            """
    )
    @ApiResponse(responseCode = "200", description = "Preview computed successfully")
    @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    @ApiResponse(responseCode = "403", description = "Caller is not a DRIVER")
    @ApiResponse(responseCode = "404", description = "Reservation or park not found")
    @ApiResponse(responseCode = "409", description = "Reservation can no longer be updated")
    @ApiResponse(responseCode = "422", description = "Invalid date range or off-hours booking")
    @PostMapping("/{reservationId}/preview-update")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ReservationUpdatePreviewResponse> previewUpdateReservation(
        @PathVariable UUID reservationId,
        @Valid @RequestBody UpdateReservationRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(reservationService.previewUpdate(jwt.getSubject(), reservationId, request));
    }

    @Operation(
        summary = "Update a reservation",
        description = """
            Updates a future confirmed reservation owned by the authenticated driver.
            Re-runs the same validation and conflict checks used during reservation creation.
            """
    )
    @ApiResponse(responseCode = "200", description = "Reservation updated successfully")
    @ApiResponse(responseCode = "400", description = "Validation error in request body")
    @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    @ApiResponse(responseCode = "403", description = "Caller is not a DRIVER")
    @ApiResponse(responseCode = "404", description = "Reservation, park, vehicle or spot not found")
    @ApiResponse(responseCode = "409", description = "Reservation can no longer be updated or new slot is unavailable")
    @ApiResponse(responseCode = "422", description = "Invalid date range or off-hours booking")
    @PutMapping("/{reservationId}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ReservationUpdateResponse> updateReservation(
        @PathVariable UUID reservationId,
        @Valid @RequestBody UpdateReservationRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(reservationService.update(jwt.getSubject(), reservationId, request));
    }

    @Operation(
        summary = "Cancel a reservation",
        description = "Cancels a future confirmed reservation owned by the authenticated driver and releases the locked parking spot."
    )
    @ApiResponse(responseCode = "200", description = "Reservation cancelled successfully")
    @ApiResponse(responseCode = "401", description = "Missing or invalid JWT")
    @ApiResponse(responseCode = "403", description = "Caller is not a DRIVER")
    @ApiResponse(responseCode = "404", description = "Reservation not found for this driver")
    @ApiResponse(responseCode = "409", description = "Reservation can no longer be cancelled")
    @DeleteMapping("/{reservationId}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ReservationResponse> cancelReservation(
        @PathVariable UUID reservationId,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(reservationService.cancel(jwt.getSubject(), reservationId));
    }
}
