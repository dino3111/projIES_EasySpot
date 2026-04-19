package pt.ua.deti.apieasyspot.occupancy.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.service.ParkService;

import java.util.UUID;

@RestController
@RequestMapping("/api/parks")
@RequiredArgsConstructor
public class ParkController {

    private final ParkService parkService;

    @GetMapping("/{id}/details")
    public ResponseEntity<ParkingLotDetailsResponse> getDetails(@PathVariable UUID id) {
        return ResponseEntity.ok(parkService.getDetails(id));
    }
}
