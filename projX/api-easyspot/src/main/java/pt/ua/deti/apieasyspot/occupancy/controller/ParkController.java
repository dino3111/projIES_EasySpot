package pt.ua.deti.apieasyspot.occupancy.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotSummaryResponse;
import pt.ua.deti.apieasyspot.occupancy.service.ParkService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/parks")
@RequiredArgsConstructor
public class ParkController {

    private final ParkService parkService;

    @GetMapping("/list")
    public ResponseEntity<ParkingLotSummaryResponse> listParks(
        @RequestParam(required = false) String textQuery,
        @RequestParam(required = false) Integer minAvailableSpaces,
        @RequestParam(required = false) List<String> filters,
        @RequestParam(required = false) String vehicleId,
        @RequestParam(defaultValue = "1") int page,
        @RequestParam(defaultValue = "20") int pageSize
    ) {
        return ResponseEntity.ok(parkService.searchParks(textQuery, minAvailableSpaces, filters, vehicleId, page, pageSize));
    }

    @GetMapping("/{id}/details")
    public ResponseEntity<ParkingLotDetailsResponse> getDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(parkService.getDetails(id));
    }
}
