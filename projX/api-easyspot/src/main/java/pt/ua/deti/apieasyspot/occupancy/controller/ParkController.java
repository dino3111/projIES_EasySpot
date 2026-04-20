package pt.ua.deti.apieasyspot.occupancy.controller;

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
public class ParkController {

    private final ParkService parkService;
    private final VehicleService vehicleService;

    @GetMapping("/list")
    public ResponseEntity<ParkingLotSummaryResponse> listParks(
        @RequestParam(required = false) String textQuery,
        @RequestParam(required = false) Integer minAvailableSpaces,
        @RequestParam(required = false) List<String> filters,
        @RequestParam(required = false) UUID vehicleId,
        @RequestParam(defaultValue = "1") @Min(1) int page,
        @RequestParam(defaultValue = "20") @Min(1) int pageSize
    ) {
        List<String> activeFilters = filters != null ? new ArrayList<>(filters) : new ArrayList<>();
        if (vehicleId != null) {
            VehicleCapabilities caps = vehicleService.getCapabilities(vehicleId);
            if (caps.ev() && !activeFilters.contains("EV")) activeFilters.add("EV");
            if (caps.accessible() && !activeFilters.contains("ACCESSIBLE")) activeFilters.add("ACCESSIBLE");
        }
        return ResponseEntity.ok(parkService.searchParks(textQuery, minAvailableSpaces, activeFilters, page, pageSize));
    }

    @GetMapping("/{id}/details")
    public ResponseEntity<ParkingLotDetailsResponse> getDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(parkService.getDetails(id));
    }
}
