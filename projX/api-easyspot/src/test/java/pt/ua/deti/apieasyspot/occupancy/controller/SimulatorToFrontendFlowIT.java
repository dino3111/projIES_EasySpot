package pt.ua.deti.apieasyspot.occupancy.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.TestTimescaleDataSourceConfig;
import pt.ua.deti.apieasyspot.occupancy.kafka.ParkingSpotEventKafkaListener;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;

import java.util.Map;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;

@SpringBootTest
@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, TestTimescaleDataSourceConfig.class})
class SimulatorToFrontendFlowIT {

    @Autowired WebApplicationContext wac;
    @Autowired ObjectMapper objectMapper;
    @Autowired ParkingSpotEventKafkaListener listener;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired ParkingSpotRepository parkingSpotRepository;

    @MockitoBean JwtDecoder jwtDecoder;

    MockMvc mockMvc;
    ParkingLot lot;
    ParkingSpot spot;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();

        parkingSpotRepository.deleteAll();
        parkingLotRepository.deleteAll();

        lot = new ParkingLot();
        lot.setName("Parque E2E");
        lot.setCity("Aveiro");
        lot.setAddress("Rua E2E, 1");
        lot.setLatitude(40.6405);
        lot.setLongitude(-8.6538);
        lot.setTotalSpaces(20);
        lot = parkingLotRepository.save(lot);

        spot = new ParkingSpot();
        spot.setParkingLot(lot);
        spot.setSpotNumber("A01");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(1);
        spot.setSpotCol(1);
        spot.setStatus("free");
        spot = parkingSpotRepository.save(spot);
    }

    @Test
    void simulatedStatusChange_propagatesToPersistenceAndFrontendApi() throws Exception {
        String payload = objectMapper.writeValueAsString(Map.of(
            "eventId", UUID.randomUUID(),
            "eventType", "spot.status.changed",
            "parkId", lot.getId(),
            "spotId", spot.getId(),
            "previousStatus", "free",
            "status", "occupied",
            "occurredAt", "2026-05-21T09:30:00Z",
            "version", 1,
            "payload", Map.of("reason", "vehicle_entered")
        ));

        listener.onEvent(payload);

        ParkingSpot persisted = parkingSpotRepository.findById(spot.getId()).orElseThrow();
        org.assertj.core.api.Assertions.assertThat(persisted.getStatus()).isEqualTo("occupied");

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.spotMap[0].spotId").value(spot.getId().toString()))
            .andExpect(jsonPath("$.spotMap[0].spotNumber").value("A01"))
            .andExpect(jsonPath("$.spotMap[0].status").value("occupied"));
    }
}
