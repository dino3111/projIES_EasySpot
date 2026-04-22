package pt.ua.deti.apieasyspot.billing.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
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
@Tag(name = "Driver Costs", description = "Driver spending and trip planning analytics")
public class DriverPlanningController {

    private final ParkingPlanningService planningService;

    @GetMapping("/planning")
    @Operation(summary = "Estimate parking costs and best options for a planned trip")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Planning generated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid query parameters"),
        @ApiResponse(responseCode = "403", description = "User is not a driver")
    })
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ParkingPlanningResponse> getPlanning(
        @Parameter(description = "City name to search parking options")
        @RequestParam @NotBlank String city,
        @Parameter(description = "Estimated parking duration in minutes", example = "90")
        @RequestParam @Min(1) int estimatedDurationMinutes,
        @Parameter(description = "Filter for EV-compatible parking lots")
        @RequestParam(required = false) Boolean isElectric,
        @Parameter(description = "Filter for accessible parking lots")
        @RequestParam(required = false) Boolean isAccessible,
        @Parameter(description = "Maximum distance from destination in meters", example = "5000")
        @RequestParam(defaultValue = "5000") @DecimalMin("0.0") double maxDistanceMeters,
        @Parameter(description = "Destination latitude", example = "40.6405")
        @RequestParam @NotNull Double lat,
        @Parameter(description = "Destination longitude", example = "-8.6538")
        @RequestParam @NotNull Double lng,
        @Parameter(description = "Sort strategy for suggested options")
        @RequestParam(required = false) ParkingPlanningRequest.OrderBy orderBy
    ) {
        ParkingPlanningRequest req = new ParkingPlanningRequest(
            city, estimatedDurationMinutes, isElectric, isAccessible,
            maxDistanceMeters, new ParkingPlanningRequest.LocationRequest(lat, lng), orderBy
        );
        return ResponseEntity.ok(planningService.plan(req));
    }
}
