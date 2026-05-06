package pt.ua.deti.apieasyspot.occupancy.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotSummaryResponse;
import pt.ua.deti.apieasyspot.occupancy.service.ParkService;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleCapabilities;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleService;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/parks")
@RequiredArgsConstructor
@Validated
@Tag(name = "Parks", description = "Parking lot search and details")
public class ParkController {

    private final ParkService parkService;
    private final VehicleService vehicleService;

    @Operation(
        summary = "List parks with filters",
        description = "Returns paginated parking lots and supports text, availability and feature filters. " +
            "When vehicleId is provided, compatible filters are automatically enriched with vehicle capabilities."
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Parking lots retrieved successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid query parameters")
    })
    @GetMapping("/list")
    public ResponseEntity<ParkingLotSummaryResponse> listParks(
        @Parameter(description = "Optional search text for parking lot name or location", example = "Aveiro")
        @RequestParam(required = false) String textQuery,
        @Parameter(description = "Optional minimum number of available spaces", example = "5")
        @RequestParam(required = false) Integer minAvailableSpaces,
        @Parameter(description = "Optional city filter", example = "Aveiro")
        @RequestParam(required = false) String city,
        @Parameter(
            description = "Optional feature filters",
            schema = @Schema(type = "array", allowableValues = {"EV", "ACCESSIBLE", "COVERED", "SECURITY"})
        )
        @RequestParam(required = false) List<String> filters,
        @Parameter(description = "Optional vehicle UUID used to infer compatibility filters", example = "9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57")
        @RequestParam(required = false) UUID vehicleId,
        @Parameter(description = "Page number (1-based)", example = "1")
        @RequestParam(defaultValue = "1") @Min(1) int page,
        @Parameter(description = "Page size", example = "20")
        @RequestParam(defaultValue = "20") @Min(1) int pageSize
    ) {
        List<String> activeFilters = filters != null ? new ArrayList<>(filters) : new ArrayList<>();
        if (vehicleId != null) {
            VehicleCapabilities caps = vehicleService.getCapabilities(vehicleId);
            if (caps.ev() && !activeFilters.contains("EV")) activeFilters.add("EV");
            if (caps.accessible() && !activeFilters.contains("ACCESSIBLE")) activeFilters.add("ACCESSIBLE");
        }
        return ResponseEntity.ok(parkService.searchParks(textQuery, minAvailableSpaces, city, activeFilters, page, pageSize));
    }

    @Operation(summary = "List available cities")
    @GetMapping("/cities")
    public ResponseEntity<List<String>> listCities() {
        return ResponseEntity.ok(parkService.listCities());
    }

    @Operation(summary = "Get parking lot details")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Parking lot details retrieved successfully"),
        @ApiResponse(responseCode = "404", description = "Parking lot not found")
    })
    @GetMapping("/{id}/details")
    public ResponseEntity<ParkingLotDetailsResponse> getDetails(
        @Parameter(description = "Parking lot UUID", example = "9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57")
        @PathVariable UUID id
    ) {
        return ResponseEntity.ok(parkService.getDetails(id));
    }
}
