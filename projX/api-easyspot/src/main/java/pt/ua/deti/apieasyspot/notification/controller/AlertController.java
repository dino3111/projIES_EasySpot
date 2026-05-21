package pt.ua.deti.apieasyspot.notification.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.notification.dto.AlertResponse;
import pt.ua.deti.apieasyspot.notification.dto.AlertStateHistoryEntry;
import pt.ua.deti.apieasyspot.notification.dto.AlertSubscriptionResponse;
import pt.ua.deti.apieasyspot.notification.dto.AlertStateUpdate;
import pt.ua.deti.apieasyspot.notification.dto.CreateSensorTaskRequest;
import pt.ua.deti.apieasyspot.notification.dto.CreateAlertSubscriptionRequest;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.analytics.service.TechnicianParkAssignmentService;
import pt.ua.deti.apieasyspot.notification.service.AlertService;
import pt.ua.deti.apieasyspot.notification.service.AlertSubscriptionService;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.sensor.model.SensorRegistry;
import pt.ua.deti.apieasyspot.sensor.model.SensorStatus;
import pt.ua.deti.apieasyspot.sensor.repository.SensorRegistryRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.springframework.http.HttpStatus;

@Tag(name = "Alerts", description = "Alert state management")
@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;
    private final AlertSubscriptionService alertSubscriptionService;
    private final TechnicianParkAssignmentService assignmentService;
    private final SensorRegistryRepository sensorRegistryRepository;

    @Operation(summary = "List alerts (technicians see only their assigned parks)")
    @ApiResponse(responseCode = "200", description = "List of alerts")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a technical or manager")
    @GetMapping
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER')")
    public ResponseEntity<List<AlertResponse>> listAlerts(
        @RequestParam(required = false) UUID parkId,
        @RequestParam(required = false) StateAlert state,
        @RequestParam(required = false) SeverityAlert severity,
        @RequestParam(required = false) OffsetDateTime from,
        @RequestParam(required = false) OffsetDateTime to,
        @AuthenticationPrincipal Jwt jwt
    ) {
        List<String> groups = jwt.getClaimAsStringList("groups");
        boolean isTechnical = groups != null && groups.stream()
            .map(g -> g.replaceAll("^/+", "").toUpperCase())
            .anyMatch("TECHNICAL"::equals);

        if (isTechnical) {
            List<UUID> assignedParkIds = assignmentService.getAssignedParkIds(jwt.getSubject());
            if (parkId != null && !assignedParkIds.contains(parkId)) {
                return ResponseEntity.status(403).build();
            }
            List<UUID> effectiveParkIds = parkId != null ? List.of(parkId) : assignedParkIds;
            return ResponseEntity.ok(
                alertService.listAlertsByParks(effectiveParkIds, state, severity, from, to).stream()
                    .map(AlertResponse::from)
                    .toList());
        }

        return ResponseEntity.ok(alertService.listAlerts(parkId, state, severity, from, to).stream()
            .map(AlertResponse::from)
            .toList());
    }

    @Operation(summary = "Create an alert subscription")
    @ApiResponse(responseCode = "200", description = "Alert subscription created successfully")
    @ApiResponse(responseCode = "400", description = "Invalid subscription request payload")
    @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    @ApiResponse(responseCode = "403", description = "User is authenticated but not a DRIVER")
    @PostMapping("/subscriptions")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<AlertSubscriptionResponse> createSubscription(
        @RequestBody @Valid CreateAlertSubscriptionRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        AlertSubscriptionResponse response = alertSubscriptionService.create(jwt.getSubject(), request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Update alert state")
    @ApiResponse(responseCode = "204", description = "Alert state updated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid alert state payload")
    @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    @ApiResponse(responseCode = "403", description = "User is authenticated but not a TECHNICAL or MANAGER")
    @ApiResponse(responseCode = "404", description = "Alert not found")
    @PatchMapping("/{id}/state")
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER')")
    public ResponseEntity<Void> updateState(
        @Parameter(description = "Alert UUID", example = "9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57")
        @PathVariable UUID id,
        @RequestBody AlertStateUpdate body
    ) {
        alertService.updateState(id, body.state(), body.notes());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/history")
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER')")
    public ResponseEntity<List<AlertStateHistoryEntry>> stateHistory(@PathVariable UUID id) {
        return ResponseEntity.ok(alertService.history(id));
    }

    @Operation(summary = "Create a sensor alert when a technician needs to open a task from a failed sensor")
    @ApiResponse(responseCode = "201", description = "Sensor alert created successfully")
    @ApiResponse(responseCode = "400", description = "Sensor is not in a failed state")
    @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    @ApiResponse(responseCode = "403", description = "User is authenticated but not a TECHNICAL or MANAGER")
    @ApiResponse(responseCode = "404", description = "Sensor not found")
    @PostMapping("/sensor-tasks/{sensorId}")
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER')")
    public ResponseEntity<AlertResponse> createSensorTask(
        @PathVariable String sensorId,
        @RequestBody(required = false) CreateSensorTaskRequest body,
        @AuthenticationPrincipal Jwt jwt
    ) {
        SensorRegistry sensor = sensorRegistryRepository.findById(sensorId)
            .orElseThrow(() -> new ResourceNotFoundException("Sensor not found: " + sensorId));

        List<UUID> assignedParkIds = assignmentService.getAssignedParkIds(jwt.getSubject());
        UUID sensorParkId = sensor.getParkingLot().getId();
        if (!assignedParkIds.contains(sensorParkId)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sensor is not in an assigned park");
        }

        if (sensor.getStatus() == SensorStatus.OPERATIONAL) {
            throw new IllegalStateException("Sensor is operational: " + sensorId);
        }

        SeverityAlert severity = SeverityAlert.CRITICAL;
        if (body != null && body.severity() != null && !body.severity().isBlank()) {
            try {
                severity = SeverityAlert.valueOf(body.severity().trim().toUpperCase(Locale.ROOT));
            } catch (IllegalArgumentException ex) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid severity: " + body.severity());
            }
        }

        Alert saved = alertService.createSensorAlert(
            sensor.getParkingLot().getId(),
            sensor.getParkingLot().getName(),
            sensor.getZone(),
            sensorId,
            (body != null && body.notes() != null && !body.notes().isBlank())
                ? body.notes()
                : "Falha detetada no sensor " + sensorId + ".",
            body != null ? body.notes() : null,
            severity
        );
        return ResponseEntity.status(201).body(AlertResponse.from(saved));
    }

}
