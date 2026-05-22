package pt.ua.deti.apieasyspot.sensor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import jakarta.servlet.http.HttpServletRequest;
import pt.ua.deti.apieasyspot.analytics.service.TechnicianParkAssignmentService;
import pt.ua.deti.apieasyspot.sensor.dto.SensorDetailDto;
import pt.ua.deti.apieasyspot.sensor.dto.SensorStatusUpdateRequest;
import pt.ua.deti.apieasyspot.sensor.dto.SensorSummaryDto;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;
import pt.ua.deti.apieasyspot.sensor.service.SensorNotFoundException;
import pt.ua.deti.apieasyspot.sensor.dto.SensorBootstrapContextDto;
import pt.ua.deti.apieasyspot.sensor.dto.BackendDecisionHistoryEntry;
import pt.ua.deti.apieasyspot.sensor.service.SensorBootstrapContextService;

import java.util.List;
import java.util.UUID;

@Tag(name = "Sensor Logs", description = "Remote sensor diagnostics and log access")
@RestController
@RequestMapping("/api/technician/sensors")
@RequiredArgsConstructor
@Slf4j
public class SensorLogsController {

    private final SensorLogsService sensorLogsService;
    private final TechnicianParkAssignmentService assignmentService;
    private final SensorBootstrapContextService sensorBootstrapContextService;

    @Operation(summary = "List sensors for the current technician's assigned parks")
    @ApiResponse(responseCode = "200", description = "Sensor list")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a technician")
    @GetMapping
    @PreAuthorize("hasRole('TECHNICAL')")
    public ResponseEntity<List<SensorSummaryDto>> listSensors(@AuthenticationPrincipal Jwt jwt) {
        List<UUID> assignedParkIds = assignmentService.getAssignedParkIds(jwt.getSubject());
        List<SensorSummaryDto> sensors = sensorLogsService.listSensorsByParks(assignedParkIds);
        log.debug(
            "[TECH-SENSORS] subject={} assignedParkIdsCount={} sensorsCount={}",
            jwt.getSubject(), assignedParkIds.size(), sensors.size()
        );
        return ResponseEntity.ok(sensors);
    }

    @Operation(summary = "Get sensor detail with full log history")
    @ApiResponse(responseCode = "200", description = "Sensor detail with logs")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a technician")
    @ApiResponse(responseCode = "404", description = "Sensor not found")
    @GetMapping("/{sensorId}/logs")
    @PreAuthorize("hasRole('TECHNICAL')")
    public ResponseEntity<SensorDetailDto> getSensorLogs(@PathVariable String sensorId) {
        return ResponseEntity.ok(sensorLogsService.getSensorDetail(sensorId));
    }

    @GetMapping("/{sensorId}/decisions")
    @PreAuthorize("hasRole('TECHNICAL')")
    public ResponseEntity<List<BackendDecisionHistoryEntry>> getSensorDecisionHistory(@PathVariable String sensorId) {
        return ResponseEntity.ok(sensorLogsService.decisionHistory(sensorId));
    }

    @Operation(summary = "Update sensor status after repair")
    @ApiResponse(responseCode = "204", description = "Sensor status updated")
    @ApiResponse(responseCode = "400", description = "Invalid status value")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a technician")
    @ApiResponse(responseCode = "404", description = "Sensor not found")
    @PatchMapping("/{sensorId}/status")
    @PreAuthorize("hasRole('TECHNICAL')")
    public ResponseEntity<Void> updateSensorStatus(
            @PathVariable String sensorId,
            @RequestBody @Valid SensorStatusUpdateRequest body) {
        sensorLogsService.updateSensorStatus(sensorId, body);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Get read-only bootstrap context for virtual sensor pipeline")
    @ApiResponse(responseCode = "200", description = "Consistent context snapshot")
    @GetMapping("/context")
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER') or @sensorServiceAuth.hasValidKey(#request)")
    public ResponseEntity<SensorBootstrapContextDto> getBootstrapContext(HttpServletRequest request) {
        return ResponseEntity.ok(sensorBootstrapContextService.snapshot());
    }

    @Operation(summary = "Get lightweight bootstrap context for simulators")
    @ApiResponse(responseCode = "200", description = "Base context snapshot")
    @GetMapping("/context/base")
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER') or @sensorServiceAuth.hasValidKey(#request)")
    public ResponseEntity<SensorBootstrapContextDto.BaseSnapshotDto> getBaseBootstrapContext(HttpServletRequest request) {
        return ResponseEntity.ok(sensorBootstrapContextService.baseSnapshot());
    }

    @Operation(summary = "Get only the active reservations for the virtual sensor pipeline")
    @ApiResponse(responseCode = "200", description = "Active reservations snapshot")
    @GetMapping("/context/reservations")
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER') or @sensorServiceAuth.hasValidKey(#request)")
    public ResponseEntity<SensorBootstrapContextDto.ReservationSnapshotDto> getReservationsSnapshot(HttpServletRequest request) {
        return ResponseEntity.ok(sensorBootstrapContextService.reservationsSnapshot());
    }

    @ExceptionHandler(SensorNotFoundException.class)
    ResponseEntity<Void> handleNotFound() {
        return ResponseEntity.notFound().build();
    }

}
