package pt.ua.deti.apieasyspot.billing.controller;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningRequest;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningResponse;
import pt.ua.deti.apieasyspot.billing.service.ParkingPlanningService;

@RestController
@RequestMapping("/api/driver/costs")
@RequiredArgsConstructor
@Validated
public class DriverPlanningController {

    private final ParkingPlanningService planningService;

    @GetMapping("/planning")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ParkingPlanningResponse> getPlanning(
        @RequestParam @NotBlank String city,
        @RequestParam @Min(1) int estimatedDurationMinutes,
        @RequestParam(required = false) Boolean isElectric,
        @RequestParam(required = false) Boolean isAccessible,
        @RequestParam(defaultValue = "5000") @DecimalMin("0.0") double maxDistanceMeters,
        @RequestParam @NotNull Double lat,
        @RequestParam @NotNull Double lng,
        @RequestParam(required = false) ParkingPlanningRequest.OrderBy orderBy
    ) {
        ParkingPlanningRequest req = new ParkingPlanningRequest(
            city, estimatedDurationMinutes, isElectric, isAccessible,
            maxDistanceMeters, new ParkingPlanningRequest.LocationRequest(lat, lng), orderBy
        );
        return ResponseEntity.ok(planningService.plan(req));
    }
}
