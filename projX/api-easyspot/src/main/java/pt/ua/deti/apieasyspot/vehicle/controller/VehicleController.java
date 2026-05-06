package pt.ua.deti.apieasyspot.vehicle.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCreateRequest;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleLookupResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleUpdateRequest;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleService;

import java.util.List;
import java.util.UUID;

@Tag(name = "Vehicles", description = "Driver vehicle management")
@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {
    private final VehicleService vehicleService;

    @Operation(summary = "Lookup plate data", description = "Fetches vehicle data for a Portuguese plate via the EasySpot scraper service.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Vehicle data found"),
        @ApiResponse(responseCode = "404", description = "Plate not found in registry"),
        @ApiResponse(responseCode = "503", description = "Vehicle lookup service unavailable")
    })
    @GetMapping("/lookup")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<VehicleLookupResponse> lookupPlate(@RequestParam String plate) {
        return ResponseEntity.ok(vehicleService.lookupPlate(plate));
    }

    @Operation(summary = "Add a vehicle", description = "Adds a vehicle to the authenticated driver's profile.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Vehicle added successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid request or plate format"),
        @ApiResponse(responseCode = "409", description = "Vehicle with this plate already exists")
    })
    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<VehicleResponse> createVehicle(
        @RequestBody @Valid VehicleCreateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(vehicleService.createVehicle(jwt.getSubject(), request));
    }

    @Operation(summary = "Update a vehicle", description = "Updates a vehicle belonging to the authenticated driver. Re-runs lookup if the plate changes.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Vehicle updated successfully"),
        @ApiResponse(responseCode = "404", description = "Vehicle not found"),
        @ApiResponse(responseCode = "403", description = "Vehicle doesn't belong to this driver"),
        @ApiResponse(responseCode = "503", description = "Vehicle lookup service unavailable")
    })
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<VehicleResponse> updateVehicle(
        @PathVariable UUID id,
        @RequestBody @Valid VehicleUpdateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(vehicleService.updateVehicle(jwt.getSubject(), id, request));
    }

    @Operation(summary = "Delete a vehicle", description = "Removes a vehicle belonging to the authenticated driver.")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Vehicle deleted"),
        @ApiResponse(responseCode = "404", description = "Vehicle not found")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<Void> deleteVehicle(
        @PathVariable UUID id,
        @AuthenticationPrincipal Jwt jwt
    ) {
        vehicleService.deleteVehicle(jwt.getSubject(), id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "List driver vehicles", description = "Returns all vehicles belonging to the authenticated driver.")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Vehicles retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    @GetMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<VehicleResponse>> listVehicles(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(vehicleService.listVehicles(jwt.getSubject()));
    }
}
