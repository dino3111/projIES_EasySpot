package pt.ua.deti.apieasyspot.sensor.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.TestTimescaleDataSourceConfig;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.sensor.model.SensorRegistry;
import pt.ua.deti.apieasyspot.sensor.model.SensorStatus;
import pt.ua.deti.apieasyspot.sensor.repository.SensorRegistryRepository;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;

import java.time.LocalDateTime;
import org.springframework.http.MediaType;
import pt.ua.deti.apieasyspot.sensor.model.SensorStatus;

import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, TestTimescaleDataSourceConfig.class})
class SensorLogsControllerIT {

    @Autowired WebApplicationContext wac;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired SensorRegistryRepository sensorRegistryRepository;
    @Autowired TimescaleAlertRepository alertRepository;
    @Autowired @Qualifier("timescaleJdbcTemplate") JdbcTemplate timescaleJdbc;
    @MockitoBean JwtDecoder jwtDecoder;

    MockMvc mockMvc;
    ParkingLot lot;
    SensorRegistry sensor;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();

        timescaleJdbc.update("DELETE FROM alerts WHERE sensor_id IN ('IR-IT-01','IR-IT-02')");
        sensorRegistryRepository.findById("IR-IT-01").ifPresent(s -> sensorRegistryRepository.delete(s));
        sensorRegistryRepository.findById("IR-IT-02").ifPresent(s -> sensorRegistryRepository.delete(s));

        lot = new ParkingLot();
        lot.setName("Parque IT Teste");
        lot.setCity("Aveiro");
        lot.setAddress("Rua de Teste, 1");
        lot.setLatitude(40.63);
        lot.setLongitude(-8.65);
        lot.setTotalSpaces(50);
        lot = parkingLotRepository.save(lot);

        sensor = new SensorRegistry();
        sensor.setSensorId("IR-IT-01");
        sensor.setParkingLot(lot);
        sensor.setZone("Piso 0 – Zona A");
        sensor.setStatus(SensorStatus.OFFLINE);
        sensor.setLastSeenAt(LocalDateTime.now().minusHours(2));
        sensor.setCreatedAt(LocalDateTime.now().minusDays(30));
        sensorRegistryRepository.save(sensor);

        SensorRegistry sensor2 = new SensorRegistry();
        sensor2.setSensorId("IR-IT-02");
        sensor2.setParkingLot(lot);
        sensor2.setZone("Sala Técnica");
        sensor2.setStatus(SensorStatus.OPERATIONAL);
        sensor2.setLastSeenAt(LocalDateTime.now().minusMinutes(5));
        sensor2.setCreatedAt(LocalDateTime.now().minusDays(30));
        sensorRegistryRepository.save(sensor2);

        timescaleJdbc.update("""
            INSERT INTO alerts (id, parking_lot_id, parking_lot_name, type, severity, state,
                zone, spot_number, sensor_id, plate, description,
                photo_url, attributed_to, notes, created_at, resolved_at)
            VALUES (gen_random_uuid(), ?, 'Parque IT Teste', 'SENSOR', 'CRITICAL', 'OPEN',
                'Piso 0 – Zona A', 'A01', 'IR-IT-01', NULL, 'Falha de leitura no sensor IR-IT-01.',
                NULL, NULL, NULL, NOW() - INTERVAL '2 hours', NULL)
            """, lot.getId());

        timescaleJdbc.update("""
            INSERT INTO alerts (id, parking_lot_id, parking_lot_name, type, severity, state,
                zone, spot_number, sensor_id, plate, description,
                photo_url, attributed_to, notes, created_at, resolved_at)
            VALUES (gen_random_uuid(), ?, 'Parque IT Teste', 'SENSOR', 'WARNING', 'RESOLVED',
                'Piso 0 – Zona A', 'A01', 'IR-IT-01', NULL, 'Sinal IR abaixo do limiar.',
                NULL, 'Laura Farias', NULL, NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days')
            """, lot.getId());
    }

    // ── Security ──────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/technician/sensors - unauthenticated - returns 401")
    void listSensors_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/technician/sensors"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/technician/sensors - DRIVER role - returns 403")
    void listSensors_driverRole_returns403() throws Exception {
        mockMvc.perform(get("/api/technician/sensors")
                .with(jwtWithRole("sub-driver", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/technician/sensors - MANAGER role - returns 403")
    void listSensors_managerRole_returns403() throws Exception {
        mockMvc.perform(get("/api/technician/sensors")
                .with(jwtWithRole("sub-manager", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - unauthenticated - returns 401")
    void sensorLogs_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/IR-IT-01/logs"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - DRIVER role - returns 403")
    void sensorLogs_driverRole_returns403() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/IR-IT-01/logs")
                .with(jwtWithRole("sub-driver", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    // ── Happy path ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/technician/sensors - TECHNICAL role - returns 200 with sensor list")
    void listSensors_technicalRole_returns200WithArray() throws Exception {
        mockMvc.perform(get("/api/technician/sensors")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[?(@.sensorId == 'IR-IT-01')].zone").value("Piso 0 – Zona A"))
            .andExpect(jsonPath("$[?(@.sensorId == 'IR-IT-01')].status").value("offline"))
            .andExpect(jsonPath("$[?(@.sensorId == 'IR-IT-02')].status").value("operational"))
            .andExpect(jsonPath("$[?(@.sensorId == 'IR-IT-01')].parkingLotName").value("Parque IT Teste"));
    }

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - TECHNICAL role - returns 200 with sensor detail and logs")
    void sensorLogs_technicalRole_returns200WithDetail() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/IR-IT-01/logs")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sensorId").value("IR-IT-01"))
            .andExpect(jsonPath("$.zone").value("Piso 0 – Zona A"))
            .andExpect(jsonPath("$.status").value("offline"))
            .andExpect(jsonPath("$.parkingLotName").value("Parque IT Teste"))
            .andExpect(jsonPath("$.logs").isArray())
            .andExpect(jsonPath("$.logs.length()").value(2))
            .andExpect(jsonPath("$.logs[0].severity").value("critical"))
            .andExpect(jsonPath("$.logs[0].state").value("open"))
            .andExpect(jsonPath("$.logs[0].description").value("Falha de leitura no sensor IR-IT-01."))
            .andExpect(jsonPath("$.logs[1].severity").value("warning"))
            .andExpect(jsonPath("$.logs[1].state").value("resolved"));
    }

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - sensor with no logs - returns 200 with empty logs array")
    void sensorLogs_noLogs_returns200WithEmptyArray() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/IR-IT-02/logs")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.sensorId").value("IR-IT-02"))
            .andExpect(jsonPath("$.status").value("operational"))
            .andExpect(jsonPath("$.logs").isArray())
            .andExpect(jsonPath("$.logs.length()").value(0));
    }

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - logs ordered newest first")
    void sensorLogs_orderedNewestFirst() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/IR-IT-01/logs")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.logs[0].severity").value("critical"))
            .andExpect(jsonPath("$.logs[1].severity").value("warning"));
    }

    // ── Not found ─────────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/technician/sensors/{id}/logs - unknown sensor - returns 404")
    void sensorLogs_unknownSensor_returns404() throws Exception {
        mockMvc.perform(get("/api/technician/sensors/SENSOR-DOES-NOT-EXIST/logs")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isNotFound());
    }

    // ── PATCH /{sensorId}/status ──────────────────────────────────────────────

    @Test
    @DisplayName("PATCH /api/technician/sensors/{id}/status - unauthenticated - returns 401")
    void updateStatus_unauthenticated_returns401() throws Exception {
        mockMvc.perform(patch("/api/technician/sensors/IR-IT-01/status")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"operational\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PATCH /api/technician/sensors/{id}/status - DRIVER role - returns 403")
    void updateStatus_driverRole_returns403() throws Exception {
        mockMvc.perform(patch("/api/technician/sensors/IR-IT-01/status")
                .with(jwtWithRole("sub-driver", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"operational\"}"))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATCH /api/technician/sensors/{id}/status - TECHNICAL role - updates to OPERATIONAL - returns 204")
    void updateStatus_technicalRole_toOperational_returns204() throws Exception {
        mockMvc.perform(patch("/api/technician/sensors/IR-IT-01/status")
                .with(jwtWithRole("sub-tech", "TECHNICAL"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"operational\",\"notes\":\"Reparação concluída.\"}"))
            .andExpect(status().isNoContent());

        SensorRegistry updated = sensorRegistryRepository.findById("IR-IT-01").orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(SensorStatus.OPERATIONAL);
    }

    @Test
    @DisplayName("PATCH /api/technician/sensors/{id}/status - TECHNICAL role - updates to MAINTENANCE - returns 204")
    void updateStatus_technicalRole_toMaintenance_returns204() throws Exception {
        mockMvc.perform(patch("/api/technician/sensors/IR-IT-01/status")
                .with(jwtWithRole("sub-tech", "TECHNICAL"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"maintenance\"}"))
            .andExpect(status().isNoContent());

        SensorRegistry updated = sensorRegistryRepository.findById("IR-IT-01").orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(SensorStatus.MAINTENANCE);
    }

    @Test
    @DisplayName("PATCH /api/technician/sensors/{id}/status - TECHNICAL role - creates alert for degraded sensor when none exists")
    void updateStatus_technicalRole_toDegraded_createsAlert() throws Exception {
        timescaleJdbc.update("DELETE FROM alerts WHERE sensor_id = 'IR-IT-02'");

        mockMvc.perform(patch("/api/technician/sensors/IR-IT-02/status")
                .with(jwtWithRole("sub-tech", "TECHNICAL"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"degraded\",\"notes\":\"Sinal intermitente\"}"))
            .andExpect(status().isNoContent());

        assertThat(alertRepository.findOpenBySensorId("IR-IT-02")).isPresent();
    }

    @Test
    @DisplayName("PATCH /api/technician/sensors/{id}/status - unknown sensor - returns 404")
    void updateStatus_unknownSensor_returns404() throws Exception {
        mockMvc.perform(patch("/api/technician/sensors/SENSOR-DOES-NOT-EXIST/status")
                .with(jwtWithRole("sub-tech", "TECHNICAL"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"operational\"}"))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PATCH /api/technician/sensors/{id}/status - invalid status value - returns 400")
    void updateStatus_invalidStatus_returns400() throws Exception {
        mockMvc.perform(patch("/api/technician/sensors/IR-IT-01/status")
                .with(jwtWithRole("sub-tech", "TECHNICAL"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"invalid_value\"}"))
            .andExpect(status().isBadRequest());
    }
}
