package pt.ua.deti.apieasyspot.notification.controller;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
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
import org.springframework.test.context.ActiveProfiles;
import pt.ua.deti.apieasyspot.TestcontainersConfiguration;
import pt.ua.deti.apieasyspot.TestTimescaleDataSourceConfig;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ActiveProfiles("test")
@SpringBootTest
@Import({TestcontainersConfiguration.class, TestTimescaleDataSourceConfig.class})
class AlertControllerIT {

    @Autowired
    WebApplicationContext wac;

    @Autowired
    TimescaleAlertRepository alertRepository;

    @Autowired
    AlertSubscriptionRepository alertSubscriptionRepository;

    @Autowired
    UserRepository userRepository;

    @Autowired
    ParkingLotRepository parkingLotRepository;

    @MockitoBean
    JwtDecoder jwtDecoder;

    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();
    }

    @BeforeEach
    void cleanSubscriptions() {
        alertSubscriptionRepository.deleteAll();
        userRepository.findByAuthentikUserId("auth-sub-postman-driver").orElseGet(() -> {
            User user = new User();
            user.setAuthentikUserId("auth-sub-postman-driver");
            user.setEmail("driver@test.pt");
            user.setName("Driver Test");
            user.setRole("DRIVER");
            return userRepository.save(user);
        });
    }

    // --- GET /api/alerts (Manager sees CLIENT reports) ---

    @Test
    @DisplayName("GET /api/alerts - MANAGER sees CLIENT report submitted by driver")
    void listAlerts_manager_seesClientReport() throws Exception {
        ParkingLot lot = parkingLotRepository.save(lot("Parque Reports"));

        Alert clientReport = new Alert();
        clientReport.setParkingLotId(lot.getId());
        clientReport.setParkingLotName(lot.getName());
        clientReport.setType(AlertType.CLIENT);
        clientReport.setSeverity(SeverityAlert.WARNING);
        clientReport.setState(StateAlert.OPEN);
        clientReport.setZone("A");
        clientReport.setSpotNumber("A-07");
        clientReport.setPlate("AA-12-BB");
        clientReport.setDescription("Veículo sem dístico no lugar de mobilidade reduzida.");
        clientReport.setAttributedTo("Filipe Teixeira");
        clientReport.setCreatedAt(OffsetDateTime.now());
        alertRepository.save(clientReport);

        mockMvc.perform(get("/api/alerts")
                .with(jwtWithRole("sub-manager", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.type == 'CLIENT')]").exists())
            .andExpect(jsonPath("$[?(@.spotNumber == 'A-07')]").exists())
            .andExpect(jsonPath("$[?(@.plate == 'AA-12-BB')]").exists());
    }

    @Test
    @DisplayName("GET /api/alerts - TECHNICAL sees CLIENT report")
    void listAlerts_technical_seesClientReport() throws Exception {
        ParkingLot lot = parkingLotRepository.save(lot("Parque Tecnico"));

        Alert clientReport = new Alert();
        clientReport.setParkingLotId(lot.getId());
        clientReport.setParkingLotName(lot.getName());
        clientReport.setType(AlertType.CLIENT);
        clientReport.setSeverity(SeverityAlert.CRITICAL);
        clientReport.setState(StateAlert.OPEN);
        clientReport.setZone("B");
        clientReport.setSpotNumber("B-01");
        clientReport.setDescription("Bloqueia saída de emergência.");
        clientReport.setAttributedTo("Luís Pedro");
        clientReport.setCreatedAt(OffsetDateTime.now());
        alertRepository.save(clientReport);

        mockMvc.perform(get("/api/alerts")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.type == 'CLIENT' && @.severity == 'CRITICAL')]").exists());
    }

    @Test
    @DisplayName("GET /api/alerts?state=OPEN - filters by state")
    void listAlerts_filterByState_returnsOnlyOpen() throws Exception {
        ParkingLot lot = parkingLotRepository.save(lot("Parque Filter"));

        Alert openAlert = new Alert();
        openAlert.setParkingLotId(lot.getId());
        openAlert.setType(AlertType.CLIENT);
        openAlert.setSeverity(SeverityAlert.WARNING);
        openAlert.setState(StateAlert.OPEN);
        openAlert.setDescription("OPEN report");
        openAlert.setCreatedAt(OffsetDateTime.now());
        alertRepository.save(openAlert);

        Alert resolvedAlert = new Alert();
        resolvedAlert.setParkingLotId(lot.getId());
        resolvedAlert.setType(AlertType.CLIENT);
        resolvedAlert.setSeverity(SeverityAlert.WARNING);
        resolvedAlert.setState(StateAlert.RESOLVED);
        resolvedAlert.setDescription("RESOLVED report");
        resolvedAlert.setCreatedAt(OffsetDateTime.now());
        alertRepository.save(resolvedAlert);

        mockMvc.perform(get("/api/alerts?state=OPEN")
                .with(jwtWithRole("sub-manager", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.state == 'RESOLVED')]").doesNotExist());
    }

    // --- PATCH /api/alerts/{id}/state ---

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - unauthenticated - returns 401")
    void updateState_unauthenticated_returns401() throws Exception {
        mockMvc.perform(patch("/api/alerts/" + UUID.randomUUID() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"RESOLVED\"}"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - DRIVER role - returns 403")
    void updateState_driverRole_returns403() throws Exception {
        mockMvc.perform(patch("/api/alerts/" + UUID.randomUUID() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"RESOLVED\"}")
                .with(jwtWithRole("sub-driver", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - unknown id - returns 404")
    void updateState_unknownId_returns404() throws Exception {
        mockMvc.perform(patch("/api/alerts/" + UUID.randomUUID() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"RESOLVED\"}")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - invalid state - returns 400")
    void updateState_invalidState_returns400() throws Exception {
        Alert alert = savedAlert(StateAlert.OPEN);

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"INVALID_STATE\"}")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - RESOLVED - sets resolvedAt and returns 204")
    void updateState_toResolved_setsResolvedAt() throws Exception {
        Alert alert = savedAlert(StateAlert.OPEN);

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"RESOLVED\"}")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isNoContent());

        Alert updated = alertRepository.findById(alert.getId()).orElseThrow();
        assertThat(updated.getState()).isEqualTo(StateAlert.RESOLVED);
        assertThat(updated.getResolvedAt()).isNotNull();
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - IN_PROGRESS - does not set resolvedAt")
    void updateState_toInProgress_doesNotSetResolvedAt() throws Exception {
        Alert alert = savedAlert(StateAlert.OPEN);

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"IN_PROGRESS\"}")
                .with(jwtWithRole("sub-manager", "MANAGER")))
            .andExpect(status().isNoContent());

        Alert updated = alertRepository.findById(alert.getId()).orElseThrow();
        assertThat(updated.getState()).isEqualTo(StateAlert.IN_PROGRESS);
        assertThat(updated.getResolvedAt()).isNull();
    }

    @Test
    @DisplayName("PATCH /api/alerts/{id}/state - with notes - persists notes")
    void updateState_withNotes_persistsNotes() throws Exception {
        Alert alert = savedAlert(StateAlert.OPEN);

        mockMvc.perform(patch("/api/alerts/" + alert.getId() + "/state")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"state\":\"IN_PROGRESS\",\"notes\":\"sensor offline, checking cables\"}")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isNoContent());

        Alert updated = alertRepository.findById(alert.getId()).orElseThrow();
        assertThat(updated.getState()).isEqualTo(StateAlert.IN_PROGRESS);
        assertThat(updated.getNotes()).isEqualTo("sensor offline, checking cables");
    }

    // ── GET /api/alerts ──────────────────────────────────────────────────────────

    @Test
    @DisplayName("GET /api/alerts - unauthenticated - returns 401")
    void listAlerts_unauthenticated_returns401() throws Exception {
        mockMvc.perform(get("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/alerts - DRIVER role - returns 403")
    void listAlerts_driverRole_returns403() throws Exception {
        mockMvc.perform(get("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub-driver", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("GET /api/alerts - TECHNICAL role - returns list")
    void listAlerts_technicalRole_returnsList() throws Exception {
        savedAlert(StateAlert.OPEN);
        savedAlert(StateAlert.RESOLVED);

        mockMvc.perform(get("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$.length()").value(org.hamcrest.Matchers.greaterThanOrEqualTo(2)));
    }

    @Test
    @DisplayName("GET /api/alerts - MANAGER role - returns list")
    void listAlerts_managerRole_returnsList() throws Exception {
        savedAlert(StateAlert.OPEN);

        mockMvc.perform(get("/api/alerts")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub-manager", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("GET /api/alerts - filter by state=OPEN - returns only open alerts")
    void listAlerts_filterByState_returnsOnlyMatching() throws Exception {
        savedAlert(StateAlert.OPEN);
        savedAlert(StateAlert.RESOLVED);

        mockMvc.perform(get("/api/alerts")
                .param("state", "OPEN")
                .contentType(MediaType.APPLICATION_JSON)
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray())
            .andExpect(jsonPath("$[0].state").value("OPEN"));
    }

    // ── POST /api/alerts/subscriptions ───────────────────────────────────────────

    @Test
    @DisplayName("POST /api/alerts/subscriptions - DRIVER role - creates subscription")
    void createSubscription_driverRole_creates() throws Exception {
        ParkingLot lot = parkingLotRepository.save(lot("Sub lot"));

        mockMvc.perform(post("/api/alerts/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "alertType":"SPACE_AVAILABLE",
                      "parkIds":["%s"],
                      "vehicleId":"AA-00-BB"
                    }
                    """.formatted(lot.getId()))
                .with(jwtWithRole("auth-sub-postman-driver", "DRIVER")))
            .andExpect(status().isOk());

        List<AlertSubscription> subs = alertSubscriptionRepository.findAll();
        assertThat(subs).hasSize(1);
        assertThat(subs.get(0).getAlertType().name()).isEqualTo("SPACE_AVAILABLE");
    }

    @Test
    @DisplayName("POST /api/alerts/subscriptions - invalid email - returns 400")
    void createSubscription_invalidEmail_returns400() throws Exception {
        mockMvc.perform(post("/api/alerts/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "alertType":"LOT_FULL",
                      "email":"not-an-email"
                    }
                    """)
                .with(jwtWithRole("auth-sub-postman-driver", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/alerts/subscriptions - duplicate subscription - returns 409")
    void createSubscription_duplicate_returns409() throws Exception {
        ParkingLot lot = parkingLotRepository.save(lot("Dedup lot"));
        String payload = """
            {
              "alertType":"LOT_FULL",
              "parkIds":["%s"]
            }
            """.formatted(lot.getId());

        mockMvc.perform(post("/api/alerts/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
                .with(jwtWithRole("auth-sub-postman-driver", "DRIVER")))
            .andExpect(status().isOk());

        mockMvc.perform(post("/api/alerts/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content(payload)
                .with(jwtWithRole("auth-sub-postman-driver", "DRIVER")))
            .andExpect(status().isConflict());
    }

    @Test
    @DisplayName("POST /api/alerts/subscriptions - invalid timezone - returns 400")
    void createSubscription_invalidScheduleTimezone_returns400() throws Exception {
        mockMvc.perform(post("/api/alerts/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {
                      "alertType":"DAILY_SUMMARY",
                      "schedule":{"frequency":"DAILY","time":"10:30","timezone":"Invalid/Timezone"}
                    }
                    """)
                .with(jwtWithRole("auth-sub-postman-driver", "DRIVER")))
            .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("POST /api/alerts/subscriptions - TECHNICAL role - returns 403")
    void createSubscription_nonDriver_returns403() throws Exception {
        mockMvc.perform(post("/api/alerts/subscriptions")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"alertType\":\"LOT_FULL\"}")
                .with(jwtWithRole("sub-tech", "TECHNICAL")))
            .andExpect(status().isForbidden());
    }

    private Alert savedAlert(StateAlert state) {
        ParkingLot lot = parkingLotRepository.save(lot("Test Lot"));

        Alert alert = new Alert();
        alert.setParkingLotId(lot.getId());
        alert.setType(AlertType.SENSOR);
        alert.setSeverity(SeverityAlert.CRITICAL);
        alert.setState(state);
        alert.setDescription("Test sensor failure");
        alert.setCreatedAt(OffsetDateTime.now());
        return alertRepository.save(alert);
    }

    private ParkingLot lot(String name) {
        ParkingLot lot = new ParkingLot();
        lot.setName(name);
        lot.setCity("Aveiro");
        lot.setAddress("Rua Central");
        lot.setLatitude(40.6405);
        lot.setLongitude(-8.6531);
        lot.setTotalSpaces(100);
        return lot;
    }
}
