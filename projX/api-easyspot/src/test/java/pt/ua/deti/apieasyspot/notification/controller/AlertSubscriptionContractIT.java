package pt.ua.deti.apieasyspot.notification.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import pt.ua.deti.apieasyspot.TestTimescaleDataSourceConfig;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;

import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;

@ActiveProfiles("test")
@Import({TestcontainersConfiguration.class, TestTimescaleDataSourceConfig.class})
@SpringBootTest
class AlertSubscriptionContractIT {

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AlertSubscriptionRepository alertSubscriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParkingLotRepository parkingLotRepository;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        alertSubscriptionRepository.deleteAll();
        userRepository.findByAuthentikUserId("auth-sub-postman-driver").orElseGet(() -> {
            User user = new User();
            user.setAuthentikUserId("auth-sub-postman-driver");
            user.setEmail("contract-driver@test.pt");
            user.setName("Contract Driver");
            user.setRole("DRIVER");
            return userRepository.save(user);
        });
    }

    @Test
    @DisplayName("Contract - POST /api/alerts returns expected response envelope")
    void contract_createAlertSubscription_responseShape() throws Exception {
        ParkingLot lot = new ParkingLot();
        lot.setName("Contract Lot");
        lot.setCity("Aveiro");
        lot.setAddress("Rua Contrato 1");
        lot.setLatitude(40.6405);
        lot.setLongitude(-8.6531);
        lot.setTotalSpaces(120);
        lot = parkingLotRepository.save(lot);

        mockMvc.perform(post("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "alertType":"LOT_FULL",
                      "parkIds":["%s"]
                    }
                    """.formatted(lot.getId()))
                .with(jwtWithRole("auth-sub-postman-driver", "DRIVER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.alertSubscription").exists())
            .andExpect(jsonPath("$.alertSubscription.id").isString())
            .andExpect(jsonPath("$.alertSubscription.enabled").value(true))
            .andExpect(jsonPath("$.alertSubscription.createdAt").isString());
    }
}
