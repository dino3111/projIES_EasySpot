package pt.ua.deti.apieasyspot.sensor.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;
import pt.ua.deti.apieasyspot.sensor.dto.SensorDetailDto;
import pt.ua.deti.apieasyspot.sensor.dto.SensorLogEntry;
import pt.ua.deti.apieasyspot.sensor.dto.SensorStatusUpdateRequest;
import pt.ua.deti.apieasyspot.sensor.dto.SensorSummaryDto;
import pt.ua.deti.apieasyspot.sensor.model.SensorRegistry;
import pt.ua.deti.apieasyspot.sensor.model.SensorStatus;
import pt.ua.deti.apieasyspot.sensor.repository.SensorLogsRepository;
import pt.ua.deti.apieasyspot.sensor.repository.SensorRegistryRepository;
import pt.ua.deti.apieasyspot.sensor.repository.BackendDecisionHistoryRepository;

import java.time.OffsetDateTime;
import java.time.LocalDateTime;
import java.time.ZoneOffset;

@Slf4j
@Service
@RequiredArgsConstructor
public class SensorLogsService {

    private final SensorLogsRepository sensorLogsRepository;
    private final SensorRegistryRepository sensorRegistryRepository;
    private final TimescaleAlertRepository alertRepository;
    private final BackendDecisionHistoryRepository backendDecisionHistoryRepository;

    public List<SensorSummaryDto> listAllSensors() {
        return sensorLogsRepository.findAllSensors();
    }

    public List<SensorSummaryDto> listSensorsByParks(List<UUID> parkIds) {
        if (parkIds.isEmpty()) return List.of();
        return sensorLogsRepository.findSensorsByParkIds(parkIds);
    }

    public SensorDetailDto getSensorDetail(String sensorId) {
        SensorRegistry sensor = sensorRegistryRepository.findById(sensorId)
            .orElseThrow(() -> new SensorNotFoundException(sensorId));

        List<SensorLogEntry> logs = sensorLogsRepository.findLogsBySensorId(sensorId);

        return new SensorDetailDto(
            sensor.getSensorId(),
            sensor.getParkingLot().getId(),
            sensor.getParkingLot().getName(),
            sensor.getParkingLot().getCity(),
            sensor.getZone(),
            sensor.getStatus().name().toLowerCase(),
            sensor.getLastSeenAt().atOffset(ZoneOffset.UTC),
            sensor.getCreatedAt().atOffset(ZoneOffset.UTC),
            logs
        );
    }

    public void updateSensorStatus(String sensorId, SensorStatusUpdateRequest request) {
        SensorRegistry sensor = sensorRegistryRepository.findById(sensorId)
            .orElseThrow(() -> new SensorNotFoundException(sensorId));

        SensorStatus newStatus;
        try {
            newStatus = SensorStatus.valueOf(request.status().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid sensor status: " + request.status());
        }

        sensor.setStatus(newStatus);
        sensorRegistryRepository.save(sensor);
        recordDecision("sensor", sensorId, "STATUS_UPDATE", "api", "status=" + newStatus.name());

        alertRepository.findOpenBySensorId(sensorId).ifPresentOrElse(alert -> {
            applySensorStatusToAlert(alert, newStatus, request.notes());
            alertRepository.save(alert);
        }, () -> {
            if (newStatus == SensorStatus.OPERATIONAL || newStatus == SensorStatus.MAINTENANCE) {
                return;
            }

            Alert alert = new Alert();
            alert.setParkingLotId(sensor.getParkingLot().getId());
            alert.setParkingLotName(sensor.getParkingLot().getName());
            alert.setType(AlertType.SENSOR);
            alert.setSeverity(SeverityAlert.CRITICAL);
            alert.setState(StateAlert.OPEN);
            alert.setZone(sensor.getZone());
            alert.setSensorId(sensorId);
            alert.setDescription(buildSensorFailureDescription(sensorId, newStatus));
            alert.setReportedBy("system");
            alert.setAttributedTo(null);
            alert.setNotes(blankToNull(request.notes()));
            alert.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
            alertRepository.save(alert);
        });
    }

    private void applySensorStatusToAlert(Alert alert, SensorStatus newStatus, String notes) {
        if (notes != null && !notes.isBlank()) {
            alert.setNotes(notes);
        }
        if (newStatus == SensorStatus.OPERATIONAL) {
            alert.setState(StateAlert.RESOLVED);
            alert.setResolvedAt(OffsetDateTime.now(ZoneOffset.UTC));
        }
    }

    private String buildSensorFailureDescription(String sensorId, SensorStatus status) {
        return switch (status) {
            case DEGRADED -> "Falha detetada no sensor " + sensorId + ".";
            case OFFLINE -> "Sensor " + sensorId + " offline.";
            default -> "Estado do sensor " + sensorId + " alterado para " + status.name().toLowerCase();
        };
    }

    public void touchSensor(String sensorId) {
        sensorRegistryRepository.findById(sensorId).ifPresent(sensor -> {
            sensor.setLastSeenAt(LocalDateTime.now(ZoneOffset.UTC));
            sensorRegistryRepository.save(sensor);
        });
    }

    public void faultSensor(String sensorId) {
        sensorRegistryRepository.findById(sensorId).ifPresent(sensor -> {
            sensor.setStatus(SensorStatus.OFFLINE);
            sensorRegistryRepository.save(sensor);

            alertRepository.findOpenBySensorId(sensorId).ifPresentOrElse(
                alert -> {},
                () -> {
                    Alert alert = new Alert();
                    alert.setParkingLotId(sensor.getParkingLot().getId());
                    alert.setParkingLotName(sensor.getParkingLot().getName());
                    alert.setType(AlertType.SENSOR);
                    alert.setSeverity(SeverityAlert.CRITICAL);
                    alert.setState(StateAlert.OPEN);
                    alert.setZone(sensor.getZone());
                    alert.setSensorId(sensorId);
                    alert.setDescription("Sensor " + sensorId + " offline.");
                    alert.setReportedBy("system");
                    alert.setAttributedTo(null);
                    alert.setNotes(null);
                    alert.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
                    alertRepository.save(alert);
                }
            );
            log.info("Sensor {} marked OFFLINE via device.fault", sensorId);
            recordDecision("sensor", sensorId, "FAULT", "device", "status=OFFLINE");
        });
    }

    public void recoverSensor(String sensorId, String recoveryType) {
        sensorRegistryRepository.findById(sensorId).ifPresent(sensor -> {
            sensor.setStatus(SensorStatus.OPERATIONAL);
            sensorRegistryRepository.save(sensor);

            alertRepository.findOpenBySensorId(sensorId).ifPresent(alert -> {
                alert.setState(StateAlert.RESOLVED);
                alert.setResolvedAt(OffsetDateTime.now(ZoneOffset.UTC));
                alert.setNotes("Recovered via " + recoveryType);
                alertRepository.save(alert);
            });

            log.info("Sensor {} recovered via {}", sensorId, recoveryType);
            recordDecision("sensor", sensorId, "RECOVER", recoveryType, "status=OPERATIONAL");
        });
    }

    public List<pt.ua.deti.apieasyspot.sensor.dto.BackendDecisionHistoryEntry> decisionHistory(String sensorId) {
        return backendDecisionHistoryRepository.findByEntity("sensor", sensorId);
    }

    private String blankToNull(String value) {
        return value != null && !value.isBlank() ? value : null;
    }

    private void recordDecision(String entityType, String entityId, String decisionType, String source, String details) {
        backendDecisionHistoryRepository.save(
            entityType,
            entityId,
            decisionType,
            source,
            details,
            java.sql.Timestamp.from(OffsetDateTime.now(ZoneOffset.UTC).toInstant())
        );
    }
}
