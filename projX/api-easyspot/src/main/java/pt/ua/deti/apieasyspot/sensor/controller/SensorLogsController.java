package pt.ua.deti.apieasyspot.sensor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.sensor.dto.SensorDetailDto;
import pt.ua.deti.apieasyspot.sensor.dto.SensorSummaryDto;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;
import pt.ua.deti.apieasyspot.sensor.service.SensorNotFoundException;

import java.util.List;

@Tag(name = "Sensor Logs", description = "Remote sensor diagnostics and log access")
@RestController
@RequestMapping("/api/technician/sensors")
@RequiredArgsConstructor
public class SensorLogsController {

    private final SensorLogsService sensorLogsService;

    @Operation(summary = "List all sensors with current status")
    @ApiResponse(responseCode = "200", description = "Sensor list")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a technician")
    @GetMapping
    @PreAuthorize("hasRole('TECHNICAL')")
    public ResponseEntity<List<SensorSummaryDto>> listSensors() {
        return ResponseEntity.ok(sensorLogsService.listAllSensors());
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

    @ExceptionHandler(SensorNotFoundException.class)
    ResponseEntity<Void> handleNotFound() {
        return ResponseEntity.notFound().build();
    }
}
