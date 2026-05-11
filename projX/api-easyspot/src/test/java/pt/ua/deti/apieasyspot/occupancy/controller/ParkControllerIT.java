package pt.ua.deti.apieasyspot.occupancy.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ParkControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private ParkingLotRepository parkingLotRepository;
    @Autowired private ParkingSpotRepository parkingSpotRepository;
    @Autowired private TimescaleOccupancySnapshotRepository occupancyRepository;

    private ParkingLot lot;

    @BeforeEach
    void setUp() {
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
        parkingLotRepository.deleteAll();
        mockMvc.perform(get("/api/parks/cities")
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$").isEmpty());
    }
}
