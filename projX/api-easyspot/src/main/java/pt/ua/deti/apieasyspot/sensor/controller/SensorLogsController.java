package pt.ua.deti.apieasyspot.sensor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.analytics.service.TechnicianParkAssignmentService;
import pt.ua.deti.apieasyspot.sensor.dto.SensorDetailDto;
import pt.ua.deti.apieasyspot.sensor.dto.SensorStatusUpdateRequest;
import pt.ua.deti.apieasyspot.sensor.dto.SensorSummaryDto;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;
import pt.ua.deti.apieasyspot.sensor.service.SensorNotFoundException;

import java.util.List;
import java.util.UUID;

@Tag(name = "Sensor Logs", description = "Remote sensor diagnostics and log access")
@RestController
@RequestMapping("/api/technician/sensors")
@RequiredArgsConstructor
public class SensorLogsController {

    private final SensorLogsService sensorLogsService;
    private final TechnicianParkAssignmentService assignmentService;

    @Operation(summary = "List sensors for the current technician's assigned parks")
    @ApiResponse(responseCode = "200", description = "Sensor list")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a technician")
    @GetMapping
    @PreAuthorize("hasRole('TECHNICAL')")
    public ResponseEntity<List<SensorSummaryDto>> listSensors(@AuthenticationPrincipal Jwt jwt) {
        List<UUID> assignedParkIds = assignmentService.getAssignedParkIds(jwt.getSubject());
        return ResponseEntity.ok(sensorLogsService.listSensorsByParks(assignedParkIds));
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

    @ExceptionHandler(SensorNotFoundException.class)
    ResponseEntity<Void> handleNotFound() {
        return ResponseEntity.notFound().build();
    }

}
