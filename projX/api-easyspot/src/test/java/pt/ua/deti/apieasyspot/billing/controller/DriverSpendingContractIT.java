package pt.ua.deti.apieasyspot.billing.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;

import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;

@SpringBootTest
class DriverSpendingContractIT {

    @Autowired private WebApplicationContext wac;
    @Autowired private UserRepository userRepository;
    @MockitoBean private JwtDecoder jwtDecoder;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
        userRepository.findByAuthentikUserId("driver-contract-spending").orElseGet(() -> {
            User user = new User();
            user.setAuthentikUserId("driver-contract-spending");
            user.setEmail("driver.contract.spending@test.com");
            user.setName("Driver Contract Spending");
            user.setRole("DRIVER");
            return userRepository.save(user);
        });
    }

    @Test
    @DisplayName("Contract - GET /api/driver/costs/spending response shape")
    void contract_spendingAnalytics_responseShape() throws Exception {
        mockMvc.perform(get("/api/driver/costs/spending")
                .with(jwtWithRole("driver-contract-spending", "DRIVER"))
                .param("timeWindow", "7D"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totals").exists())
            .andExpect(jsonPath("$.totals.totalSpent").isNumber())
            .andExpect(jsonPath("$.totals.avgPerSession").isNumber())
            .andExpect(jsonPath("$.totals.parkingSpent").isNumber())
            .andExpect(jsonPath("$.totals.chargingSpent").isNumber())
            .andExpect(jsonPath("$.insights").exists())
            .andExpect(jsonPath("$.insights.mostUsedPark").exists())
            .andExpect(jsonPath("$.timeseries").isArray())
            .andExpect(jsonPath("$.breakdownByPark").isArray())
            .andExpect(jsonPath("$.breakdownByVehicle").isArray())
            .andExpect(jsonPath("$.history").isArray());
    }
}
