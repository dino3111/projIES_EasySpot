package pt.ua.deti.apieasyspot.occupancy.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.util.List;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ParkControllerIT {

    @Autowired private MockMvc mockMvc;
    @Autowired private ParkingLotRepository parkingLotRepository;

    private ParkingLot lot;

    @BeforeEach
    void setUp() {
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
    @WithMockUser
    void getDetails_Success() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(lot.getId().toString()))
                .andExpect(jsonPath("$.name").value("Parque Central"))
                .andExpect(jsonPath("$.address").value("Rua Principal"))
                .andExpect(jsonPath("$.coordinates.lat").value(40.6))
                .andExpect(jsonPath("$.amenities[0]").value("Wifi"));
    }

    @Test
    @WithMockUser
    void getDetails_NotFound() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/details", UUID.randomUUID())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void getDetails_Unauthorized() throws Exception {
        mockMvc.perform(get("/api/parks/{id}/details", lot.getId())
                .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }
}
