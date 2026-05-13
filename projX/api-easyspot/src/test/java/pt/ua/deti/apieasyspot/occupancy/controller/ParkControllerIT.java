package pt.ua.deti.apieasyspot.occupancy.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.occupancy.model.AccessibleSpot;
import pt.ua.deti.apieasyspot.occupancy.model.EVCharger;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.AccessibleSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.EVChargerRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@Import(TestcontainersConfiguration.class)
class ParkControllerIT {

    @Autowired WebApplicationContext wac;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired EVChargerRepository evChargerRepository;
    @Autowired AccessibleSpotRepository accessibleSpotRepository;
    @Autowired ParkingSpotRepository parkingSpotRepository;
    @Autowired TimescaleOccupancySnapshotRepository occupancyRepository;

    @MockitoBean JwtDecoder jwtDecoder;

    MockMvc mockMvc;
    ParkingLot lot;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        accessibleSpotRepository.deleteAll();
        evChargerRepository.deleteAll();
        parkingSpotRepository.deleteAll();
        parkingLotRepository.deleteAll();

        lot = new ParkingLot();
        lot.setName("Parque Central");
        lot.setCity("Aveiro");
        lot.setAddress("Rua Principal");
        lot.setLatitude(40.6);
        lot.setLongitude(-8.6);
        lot.setTotalSpaces(100);
        lot.setAmenities(List.of("Wifi"));
        lot = parkingLotRepository.save(lot);
    }

    // ── Park list tests ──────────────────────────────────────────────────────

    @Test
    void listParks_Success() throws Exception {
        mockMvc.perform(get("/api/parks/list")
                .param("textQuery", "Central")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isArray())
                .andExpect(jsonPath("$.items[0].name").value("Parque Central"))
                .andExpect(jsonPath("$.pagination.totalItems").value(1));
    }

    @Test
    void listParks_Filtered_NoResults() throws Exception {
        mockMvc.perform(get("/api/parks/list")
                .param("textQuery", "NonExistent")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty())
                .andExpect(jsonPath("$.pagination.totalItems").value(0));
    }

    @Test
    void listParks_MinAvailableSpaces_WithinCapacity_ReturnsResult() throws Exception {
        mockMvc.perform(get("/api/parks/list")
                .param("minAvailableSpaces", "50")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Parque Central"));
    }

    @Test
    void listParks_MinAvailableSpaces_ExceedsCapacity_ReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/parks/list")
                .param("minAvailableSpaces", "101")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void listParks_EvFilter_NoSnapshots_ReturnsEmpty() throws Exception {
        mockMvc.perform(get("/api/parks/list")
                .param("filters", "EV")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void listParks_UnknownVehicleId_IgnoresFilter() throws Exception {
        mockMvc.perform(get("/api/parks/list")
                .param("vehicleId", UUID.randomUUID().toString())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].name").value("Parque Central"));
    }

    @Test
    void listParks_InvalidPage_ReturnsBadRequest() throws Exception {
        mockMvc.perform(get("/api/parks/list")
                .param("page", "0")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isBadRequest());
    }

    @Test
    void listParks_Unauthorized_Returns401() throws Exception {
        mockMvc.perform(get("/api/parks/list")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    // ── Park details tests ───────────────────────────────────────────────────

    @Test
    void getDetails_Success() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(lot.getId().toString()))
                .andExpect(jsonPath("$.name").value("Parque Central"))
                .andExpect(jsonPath("$.address").value("Rua Principal"))
                .andExpect(jsonPath("$.coordinates.lat").value(40.6))
                .andExpect(jsonPath("$.amenities[0]").value("Wifi"));
    }

    @Test
    void getDetails_spotMap_includesSpotIdForReservation() throws Exception {
        ParkingSpot spot = new ParkingSpot();
        spot.setParkingLot(lot);
        spot.setSpotNumber("A01");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(1);
        spot.setSpotCol(1);
        spot.setStatus("free");
        spot = parkingSpotRepository.save(spot);

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spotMap[0].spotId").value(spot.getId().toString()))
                .andExpect(jsonPath("$.spotMap[0].spotNumber").value("A01"))
                .andExpect(jsonPath("$.spotMap[0].status").value("free"));
    }

    @Test
    void getDetails_spotMap_reservedSpotHasCorrectStatus() throws Exception {
        ParkingSpot spot = new ParkingSpot();
        spot.setParkingLot(lot);
        spot.setSpotNumber("B01");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(1);
        spot.setSpotCol(1);
        spot.setStatus("reserved");
        parkingSpotRepository.save(spot);

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.spotMap[0].status").value("reserved"))
                .andExpect(jsonPath("$.spotMap[0].spotId").isNotEmpty());
    }

    @Test
    void getDetails_NotFound() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/details", UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isNotFound());
    }

    @Test
    void getDetails_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    // ── EV charger tests ─────────────────────────────────────────────────────

    @Test
    void getDetails_WithEVChargers_ReturnsChargerData() throws Exception {
        EVCharger charger = new EVCharger();
        charger.setParkingLot(lot);
        charger.setType("Type 2");
        charger.setSpeed("Rápida (22kW)");
        charger.setPricePerKwh(new BigDecimal("0.35"));
        charger.setAvailable(true);
        evChargerRepository.save(charger);

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evChargers").isArray())
                .andExpect(jsonPath("$.evChargers[0].type").value("Type 2"))
                .andExpect(jsonPath("$.evChargers[0].speed").value("Rápida (22kW)"))
                .andExpect(jsonPath("$.evChargers[0].speedKw").value(22))
                .andExpect(jsonPath("$.evChargers[0].pricePerKwh").value(0.35))
                .andExpect(jsonPath("$.evChargers[0].availability").value(true));
    }

    @Test
    void getDetails_WithUnavailableEVCharger_ReturnsAvailabilityFalse() throws Exception {
        EVCharger charger = new EVCharger();
        charger.setParkingLot(lot);
        charger.setType("CCS");
        charger.setSpeed("Ultra-rápida (50kW)");
        charger.setPricePerKwh(new BigDecimal("0.45"));
        charger.setAvailable(false);
        evChargerRepository.save(charger);

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evChargers[0].type").value("CCS"))
                .andExpect(jsonPath("$.evChargers[0].speedKw").value(50))
                .andExpect(jsonPath("$.evChargers[0].availability").value(false));
    }

    @Test
    void getDetails_WithMultipleEVChargers_ReturnsAll() throws Exception {
        for (int i = 1; i <= 3; i++) {
            EVCharger charger = new EVCharger();
            charger.setParkingLot(lot);
            charger.setType("Type 2");
            charger.setSpeed("Rápida (22kW)");
            charger.setPricePerKwh(new BigDecimal("0.30"));
            charger.setAvailable(i % 2 == 1);
            evChargerRepository.save(charger);
        }

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evChargers.length()").value(3));
    }

    @Test
    void getDetails_NoEVChargers_ReturnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evChargers").isArray())
                .andExpect(jsonPath("$.evChargers").isEmpty());
    }

    // ── Accessible spot tests ────────────────────────────────────────────────

    @Test
    void getDetails_WithAccessibleSpot_ReturnsFullInfrastructureData() throws Exception {
        AccessibleSpot spot = new AccessibleSpot();
        spot.setParkingLot(lot);
        spot.setLocation("Zona A");
        spot.setAvailable(true);
        spot.setDistanceToEntranceMeters(15);
        spot.setBaySize("4.0m x 5.0m");
        spot.setMonitored(true);
        spot.setHasRampSpace(true);
        spot.setSensorStatus("online");
        spot.setLedStatus("green");
        accessibleSpotRepository.save(spot);

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessibility").isArray())
                .andExpect(jsonPath("$.accessibility[0].location").value("Zona A"))
                .andExpect(jsonPath("$.accessibility[0].availability").value(true))
                .andExpect(jsonPath("$.accessibility[0].distanceToEntranceMeters").value(15))
                .andExpect(jsonPath("$.accessibility[0].baySize").value("4.0m x 5.0m"))
                .andExpect(jsonPath("$.accessibility[0].monitored").value(true))
                .andExpect(jsonPath("$.accessibility[0].hasRampSpace").value(true))
                .andExpect(jsonPath("$.accessibility[0].sensorStatus").value("online"))
                .andExpect(jsonPath("$.accessibility[0].ledStatus").value("green"));
    }

    @Test
    void getDetails_WithFaultyAccessibleSpot_ReturnsSensorFaulty() throws Exception {
        AccessibleSpot spot = new AccessibleSpot();
        spot.setParkingLot(lot);
        spot.setLocation("Zona B");
        spot.setAvailable(false);
        spot.setDistanceToEntranceMeters(35);
        spot.setBaySize("3.5m x 5.0m");
        spot.setMonitored(false);
        spot.setHasRampSpace(false);
        spot.setSensorStatus("faulty");
        spot.setLedStatus("yellow");
        accessibleSpotRepository.save(spot);

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessibility[0].availability").value(false))
                .andExpect(jsonPath("$.accessibility[0].monitored").value(false))
                .andExpect(jsonPath("$.accessibility[0].hasRampSpace").value(false))
                .andExpect(jsonPath("$.accessibility[0].sensorStatus").value("faulty"))
                .andExpect(jsonPath("$.accessibility[0].ledStatus").value("yellow"));
    }

    @Test
    void getDetails_NoAccessibleSpots_ReturnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessibility").isArray())
                .andExpect(jsonPath("$.accessibility").isEmpty());
    }

    @Test
    void getDetails_WithCompleteInfrastructure_ReturnsBothEVAndAccessible() throws Exception {
        EVCharger charger = new EVCharger();
        charger.setParkingLot(lot);
        charger.setType("CHAdeMO");
        charger.setSpeed("Ultra-rápida (50kW)");
        charger.setPricePerKwh(new BigDecimal("0.40"));
        charger.setAvailable(true);
        evChargerRepository.save(charger);

        AccessibleSpot spot = new AccessibleSpot();
        spot.setParkingLot(lot);
        spot.setLocation("Piso 0 - Entrada");
        spot.setAvailable(true);
        spot.setDistanceToEntranceMeters(8);
        spot.setBaySize("4.5m x 5.5m");
        spot.setMonitored(true);
        spot.setHasRampSpace(true);
        spot.setSensorStatus("online");
        spot.setLedStatus("green");
        accessibleSpotRepository.save(spot);

        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.evChargers.length()").value(1))
                .andExpect(jsonPath("$.evChargers[0].speedKw").value(50))
                .andExpect(jsonPath("$.accessibility.length()").value(1))
                .andExpect(jsonPath("$.accessibility[0].monitored").value(true));
    }

    // ── Cities tests ─────────────────────────────────────────────────────────

    @Test
    void getHourlyOccupancy_noData_returnsEmptyArray() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/occupancy/hourly", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }

    @Test
    void getHourlyOccupancy_withHistoricalData_returnsHourlyPoints() throws Exception {
        // Insert 3 snapshots at different hours within last 7 days
        Instant base = Instant.now().minus(2, ChronoUnit.DAYS);
        occupancyRepository.insert(UUID.randomUUID(), lot.getId(), ZoneType.STANDARD, 50, 100, base.minus(2, ChronoUnit.HOURS));
        occupancyRepository.insert(UUID.randomUUID(), lot.getId(), ZoneType.STANDARD, 80, 100, base.minus(1, ChronoUnit.HOURS));
        occupancyRepository.insert(UUID.randomUUID(), lot.getId(), ZoneType.STANDARD, 20, 100, base);

        mockMvc.perform(get("/api/parks/{id}/occupancy/hourly", lot.getId())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0].hour").isString())
                .andExpect(jsonPath("$[0].occupancyPercent").isNumber());
    }

    @Test
    void getHourlyOccupancy_notFound_returns404() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/occupancy/hourly", UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub", "DRIVER")))
                .andExpect(status().isNotFound());
    }

    @Test
    void listCities_returnsCityOfSavedLot() throws Exception {
        mockMvc.perform(get("/api/parks/cities")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$[0]").value("Aveiro"));
    }

    @Test
    void listCities_empty_returnsEmptyArray() throws Exception {
        accessibleSpotRepository.deleteAll();
        evChargerRepository.deleteAll();
        parkingLotRepository.deleteAll();
        mockMvc.perform(get("/api/parks/cities")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
