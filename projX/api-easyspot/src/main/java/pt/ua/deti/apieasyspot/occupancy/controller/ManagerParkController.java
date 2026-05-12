package pt.ua.deti.apieasyspot.occupancy.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.occupancy.dto.*;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.service.ManagerParkService;

import java.util.List;
import java.util.UUID;

@Tag(name = "Manager", description = "Manager park management")
@RestController
@RequestMapping("/api/manager")
@RequiredArgsConstructor
public class ManagerParkController {

    private final ManagerParkService managerParkService;

    @Operation(summary = "List all technicians")
    @ApiResponse(responseCode = "200", description = "List of technicians")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @GetMapping("/technicians")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<TechnicianSummaryResponse>> listTechnicians() {
        return ResponseEntity.ok(managerParkService.listTechnicians());
    }

    @Operation(summary = "Create a new technician account")
    @ApiResponse(responseCode = "200", description = "Technician created")
    @ApiResponse(responseCode = "400", description = "Invalid request")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @PostMapping("/technicians")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<TechnicianDetailResponse> createTechnician(
            @Valid @RequestBody CreateTechnicianRequest request) {
        return ResponseEntity.ok(managerParkService.createTechnician(request));
    }

    @Operation(summary = "List technician assignments per park")
    @ApiResponse(responseCode = "200", description = "Assignments list")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @GetMapping("/parks/assignments")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<ParkAssignmentsResponse>> listParkAssignments() {
        return ResponseEntity.ok(managerParkService.listParkAssignments());
    }

    @Operation(summary = "Create a new parking lot")
    @ApiResponse(responseCode = "200", description = "Park created")
    @ApiResponse(responseCode = "400", description = "Invalid request")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @PostMapping("/parks")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ParkingLot> createPark(@Valid @RequestBody CreateParkRequest request) {
        return ResponseEntity.ok(managerParkService.createPark(request));
    }

    @Operation(summary = "Assign a technician to a park")
    @ApiResponse(responseCode = "204", description = "Assigned")
    @ApiResponse(responseCode = "404", description = "Park or technician not found")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @PutMapping("/parks/{parkId}/technician/{technicianId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> assignTechnician(
            @PathVariable UUID parkId,
            @PathVariable UUID technicianId) {
        managerParkService.assignTechnicianToPark(parkId, technicianId);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Remove a technician from a park")
    @ApiResponse(responseCode = "204", description = "Removed")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @DeleteMapping("/parks/{parkId}/technician/{technicianId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> removeTechnician(
            @PathVariable UUID parkId,
            @PathVariable UUID technicianId) {
        managerParkService.removeTechnicianFromPark(parkId, technicianId);
        return ResponseEntity.noContent().build();
    }
}
