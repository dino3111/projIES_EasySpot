package pt.ua.deti.apieasyspot.sensor.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.sensor.dto.SensorDetailDto;
import pt.ua.deti.apieasyspot.sensor.dto.SensorLogEntry;
import pt.ua.deti.apieasyspot.sensor.dto.SensorSummaryDto;
import pt.ua.deti.apieasyspot.sensor.model.SensorRegistry;
import pt.ua.deti.apieasyspot.sensor.model.SensorStatus;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.sensor.repository.SensorLogsRepository;
import pt.ua.deti.apieasyspot.sensor.repository.SensorRegistryRepository;

import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;
import pt.ua.deti.apieasyspot.sensor.dto.SensorStatusUpdateRequest;

@ExtendWith(MockitoExtension.class)
class SensorLogsServiceTest {

    @Mock
    private SensorLogsRepository sensorLogsRepository;

    @Mock
    private SensorRegistryRepository sensorRegistryRepository;

    @Mock
    private TimescaleAlertRepository alertRepository;

    private SensorLogsService service;

    @BeforeEach
    void setUp() {
        service = new SensorLogsService(sensorLogsRepository, sensorRegistryRepository, alertRepository);
    }

    @Test
    @DisplayName("listAllSensors delegates to repository")
    void listAllSensors_delegatesToRepository() {
        UUID parkId = UUID.randomUUID();
        SensorSummaryDto summary = new SensorSummaryDto(
            "IR-TEST-01", parkId, "Parque Teste", "Aveiro", "Zona A", "operational",
            OffsetDateTime.now(ZoneOffset.UTC), OffsetDateTime.now(ZoneOffset.UTC));
        when(sensorLogsRepository.findAllSensors()).thenReturn(List.of(summary));

        List<SensorSummaryDto> result = service.listAllSensors();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).sensorId()).isEqualTo("IR-TEST-01");
    }

    @Test
    @DisplayName("getSensorDetail returns enriched detail with logs")
    void getSensorDetail_returnsDetailWithLogs() {
        UUID parkId = UUID.randomUUID();
        ParkingLot lot = new ParkingLot();
        lot.setId(parkId);
        lot.setName("Parque Teste");

        SensorRegistry sensor = new SensorRegistry();
        sensor.setSensorId("IR-TEST-01");
        sensor.setParkingLot(lot);
        sensor.setZone("Zona A");
        sensor.setStatus(SensorStatus.OPERATIONAL);
        sensor.setLastSeenAt(LocalDateTime.now());
        sensor.setCreatedAt(LocalDateTime.now());

        SensorLogEntry log = new SensorLogEntry(
            UUID.randomUUID(), "sensor", "critical", "open",
            "Falha de leitura", OffsetDateTime.now(ZoneOffset.UTC), null);

        when(sensorRegistryRepository.findById("IR-TEST-01")).thenReturn(Optional.of(sensor));
        when(sensorLogsRepository.findLogsBySensorId("IR-TEST-01")).thenReturn(List.of(log));

        SensorDetailDto detail = service.getSensorDetail("IR-TEST-01");

        assertThat(detail.sensorId()).isEqualTo("IR-TEST-01");
        assertThat(detail.parkingLotName()).isEqualTo("Parque Teste");
        assertThat(detail.status()).isEqualTo("operational");
        assertThat(detail.logs()).hasSize(1);
        assertThat(detail.logs().get(0).severity()).isEqualTo("critical");
    }

    @Test
    @DisplayName("getSensorDetail throws SensorNotFoundException when sensor does not exist")
    void getSensorDetail_unknownSensor_throwsNotFound() {
        when(sensorRegistryRepository.findById("UNKNOWN-99")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSensorDetail("UNKNOWN-99"))
            .isInstanceOf(SensorNotFoundException.class)
            .hasMessageContaining("UNKNOWN-99");
    }

    @Test
    @DisplayName("getSensorDetail returns empty logs list when no alerts exist")
    void getSensorDetail_noLogs_returnsEmptyList() {
        UUID parkId = UUID.randomUUID();
        ParkingLot lot = new ParkingLot();
        lot.setId(parkId);
        lot.setName("Parque Vazio");

        SensorRegistry sensor = new SensorRegistry();
        sensor.setSensorId("GW-TEST-01");
        sensor.setParkingLot(lot);
        sensor.setZone("Sala Técnica");
        sensor.setStatus(SensorStatus.OPERATIONAL);
        sensor.setLastSeenAt(LocalDateTime.now());
        sensor.setCreatedAt(LocalDateTime.now());

        when(sensorRegistryRepository.findById("GW-TEST-01")).thenReturn(Optional.of(sensor));
        when(sensorLogsRepository.findLogsBySensorId("GW-TEST-01")).thenReturn(List.of());

        SensorDetailDto detail = service.getSensorDetail("GW-TEST-01");

        assertThat(detail.logs()).isEmpty();
    }

    @Test
    @DisplayName("updateSensorStatus persists new status")
    void updateSensorStatus_persistsNewStatus() {
        UUID parkId = UUID.randomUUID();
        ParkingLot lot = new ParkingLot();
        lot.setId(parkId);
        lot.setName("Parque Teste");

        SensorRegistry sensor = new SensorRegistry();
        sensor.setSensorId("IR-TEST-01");
        sensor.setParkingLot(lot);
        sensor.setZone("Zona A");
        sensor.setStatus(SensorStatus.OFFLINE);
        sensor.setLastSeenAt(LocalDateTime.now());
        sensor.setCreatedAt(LocalDateTime.now());

        when(sensorRegistryRepository.findById("IR-TEST-01")).thenReturn(Optional.of(sensor));

        service.updateSensorStatus("IR-TEST-01", new SensorStatusUpdateRequest("operational", "Reparação concluída."));

        verify(sensorRegistryRepository).save(sensor);
        assertThat(sensor.getStatus()).isEqualTo(SensorStatus.OPERATIONAL);
    }

    @Test
    @DisplayName("updateSensorStatus sets MAINTENANCE status")
    void updateSensorStatus_setsMaintenanceStatus() {
        UUID parkId = UUID.randomUUID();
        ParkingLot lot = new ParkingLot();
        lot.setId(parkId);
        lot.setName("Parque Teste");

        SensorRegistry sensor = new SensorRegistry();
        sensor.setSensorId("IR-TEST-02");
        sensor.setParkingLot(lot);
        sensor.setZone("Zona B");
        sensor.setStatus(SensorStatus.OPERATIONAL);
        sensor.setLastSeenAt(LocalDateTime.now());
        sensor.setCreatedAt(LocalDateTime.now());

        when(sensorRegistryRepository.findById("IR-TEST-02")).thenReturn(Optional.of(sensor));

        service.updateSensorStatus("IR-TEST-02", new SensorStatusUpdateRequest("maintenance", null));

        verify(sensorRegistryRepository).save(sensor);
        assertThat(sensor.getStatus()).isEqualTo(SensorStatus.MAINTENANCE);
    }

    @Test
    @DisplayName("updateSensorStatus creates open sensor alert when degraded and none exists")
    void updateSensorStatus_createsAlertForDegradedSensor() {
        UUID parkId = UUID.randomUUID();
        ParkingLot lot = new ParkingLot();
        lot.setId(parkId);
        lot.setName("Parque Teste");

        SensorRegistry sensor = new SensorRegistry();
        sensor.setSensorId("IR-TEST-04");
        sensor.setParkingLot(lot);
        sensor.setZone("Zona C");
        sensor.setStatus(SensorStatus.OPERATIONAL);
        sensor.setLastSeenAt(LocalDateTime.now());
        sensor.setCreatedAt(LocalDateTime.now());

        when(sensorRegistryRepository.findById("IR-TEST-04")).thenReturn(Optional.of(sensor));
        when(alertRepository.findOpenBySensorId("IR-TEST-04")).thenReturn(Optional.empty());

        service.updateSensorStatus("IR-TEST-04", new SensorStatusUpdateRequest("degraded", "Leitura instável."));

        verify(sensorRegistryRepository).save(sensor);
        verify(alertRepository).save(argThat(alert ->
            alert.getType() == AlertType.SENSOR
                && alert.getSeverity() == SeverityAlert.CRITICAL
                && alert.getState() == StateAlert.OPEN
                && "IR-TEST-04".equals(alert.getSensorId())
                && "Leitura instável.".equals(alert.getNotes())
        ));
    }

    @Test
    @DisplayName("updateSensorStatus throws SensorNotFoundException for unknown sensor")
    void updateSensorStatus_unknownSensor_throwsNotFound() {
        when(sensorRegistryRepository.findById("UNKNOWN")).thenReturn(Optional.empty());

        assertThatThrownBy(() ->
            service.updateSensorStatus("UNKNOWN", new SensorStatusUpdateRequest("operational", null)))
            .isInstanceOf(SensorNotFoundException.class);
    }

    @Test
    @DisplayName("updateSensorStatus throws IllegalArgumentException for invalid status")
    void updateSensorStatus_invalidStatus_throwsIllegalArgument() {
        UUID parkId = UUID.randomUUID();
        ParkingLot lot = new ParkingLot();
        lot.setId(parkId);

        SensorRegistry sensor = new SensorRegistry();
        sensor.setSensorId("IR-TEST-03");
        sensor.setParkingLot(lot);
        sensor.setStatus(SensorStatus.OPERATIONAL);
        sensor.setLastSeenAt(LocalDateTime.now());
        sensor.setCreatedAt(LocalDateTime.now());

        when(sensorRegistryRepository.findById("IR-TEST-03")).thenReturn(Optional.of(sensor));

        assertThatThrownBy(() ->
            service.updateSensorStatus("IR-TEST-03", new SensorStatusUpdateRequest("invalid_status", null)))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("invalid_status");
    }
}
