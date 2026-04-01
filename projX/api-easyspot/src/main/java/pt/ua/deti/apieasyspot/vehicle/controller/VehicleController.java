package pt.ua.deti.apieasyspot.vehicle.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleResponse;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleUpdateRequest;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleService;

import java.util.UUID;

@RestController
@RequestMapping("/api/vehicles")
@RequiredArgsConstructor
public class VehicleController {
    private final VehicleService vehicleService;

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<VehicleResponse> updateVehicle(
        @PathVariable UUID id,
        @RequestBody @Valid VehicleUpdateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ){
        String authentikUserId = jwt.getSubject();
        return ResponseEntity.ok(vehicleService.updateVehicle(authentikUserId, id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<Void> deleteVehicle(
        @PathVariable UUID id,
        @AuthenticationPrincipal Jwt jwt
    ){
        String authentikUserId = jwt.getSubject();
        vehicleService.deleteVehicle(authentikUserId, id);
        return ResponseEntity.noContent().build();
    }
}
