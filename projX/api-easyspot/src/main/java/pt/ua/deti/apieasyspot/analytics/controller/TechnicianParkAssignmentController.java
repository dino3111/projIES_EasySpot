package pt.ua.deti.apieasyspot.analytics.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.analytics.dto.TechnicianParkAssignmentDto;
import pt.ua.deti.apieasyspot.analytics.service.TechnicianParkAssignmentService;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.util.List;
import java.util.UUID;

@Tag(name = "Technician Park Assignments", description = "Manage which parks are assigned to each technician")
@RestController
@RequestMapping("/api/technician/parks")
@RequiredArgsConstructor
@Slf4j
public class TechnicianParkAssignmentController {

    private final TechnicianParkAssignmentService assignmentService;
    private final ParkingLotRepository parkingLotRepository;

    /** Returns the parks assigned to the currently authenticated technician. */
    @Operation(summary = "List parks assigned to the current technician")
    @GetMapping("/my")
    @PreAuthorize("hasRole('TECHNICAL')")
    public ResponseEntity<List<TechnicianParkAssignmentDto>> getMyAssignments(
        @AuthenticationPrincipal Jwt jwt
    ) {
        UUID technicianId = assignmentService.resolveDbId(jwt.getSubject());
        List<TechnicianParkAssignmentDto> result = assignmentService.getAssignedParkIds(jwt.getSubject())
            .stream()
            .map(parkingLotRepository::findById)
            .flatMap(java.util.Optional::stream)
            .map(lot -> toDto(technicianId, lot))
            .toList();
        log.info(
            "[TECH-PARKS] subject={} technicianId={} returnedAssignments={} parkIds={}",
            jwt.getSubject(), technicianId, result.size(), result.stream().map(TechnicianParkAssignmentDto::parkingLotId).toList()
        );
        return ResponseEntity.ok(result);
    }

    private TechnicianParkAssignmentDto toDto(UUID technicianId, ParkingLot lot) {
        return new TechnicianParkAssignmentDto(
            null,
            technicianId,
            lot.getId(),
            lot.getName(),
            lot.getCity()
        );
    }

    /** Manager: list parks assigned to a specific technician. */
    @Operation(summary = "List parks assigned to a specific technician (manager only)")
    @GetMapping("/{technicianId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<TechnicianParkAssignmentDto>> getAssignmentsForTechnician(
        @PathVariable UUID technicianId
    ) {
        List<TechnicianParkAssignmentDto> result = assignmentService
            .getAssignments(technicianId).stream()
            .map(TechnicianParkAssignmentDto::from)
            .toList();
        return ResponseEntity.ok(result);
    }

    /** Manager: assign a park to a technician. */
    @Operation(summary = "Assign a park to a technician (manager only)")
    @PostMapping("/{technicianId}/{parkingLotId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<TechnicianParkAssignmentDto> assign(
        @PathVariable UUID technicianId,
        @PathVariable UUID parkingLotId
    ) {
        TechnicianParkAssignmentDto dto = TechnicianParkAssignmentDto.from(
            assignmentService.assign(technicianId, parkingLotId)
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /** Manager: remove a park assignment from a technician. */
    @Operation(summary = "Remove a park assignment from a technician (manager only)")
    @DeleteMapping("/{technicianId}/{parkingLotId}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> unassign(
        @PathVariable UUID technicianId,
        @PathVariable UUID parkingLotId
    ) {
        assignmentService.unassign(technicianId, parkingLotId);
        return ResponseEntity.noContent().build();
    }
}
