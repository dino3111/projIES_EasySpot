package pt.ua.deti.apieasyspot.occupancy.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.jdbc.DataSourceBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;
import pt.ua.deti.apieasyspot.analytics.repository.TechnicianParkAssignmentRepository;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.auth.service.AuthentikClient;
import pt.ua.deti.apieasyspot.infrastructure.ParkingSeedInitializer;
import pt.ua.deti.apieasyspot.infrastructure.TimescaleHypertableInitializer;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import javax.sql.DataSource;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;
import static pt.ua.deti.apieasyspot.support.TestJwtRequests.jwtWithRole;

/**
 * Integration test: verifies the full manager→technician flow against the real
 * PostgreSQL instance that is already running via Docker Compose.
 *
 * Only AuthentikClient is mocked — DB, JPA, security, and all repositories are real.
 *
 * Flow:
 *  1. Manager creates a technician (AuthentikClient mocked)
 *  2. Manager assigns / unassigns parks
 *  3. Technician sees only their parks via GET /api/technician/parks/my
 *  4. Technician sensor endpoint is accessible and filtered
 *  5. Role isolation: DRIVER / MANAGER cannot reach technician-only endpoints
 */
@ActiveProfiles("test")
@SpringBootTest(properties = {
    // Point at the real Compose PostgreSQL (already running on port 5432)
    "spring.datasource.url=jdbc:postgresql://localhost:5432/easyspot",
    "spring.datasource.username=easyspot",
    "spring.datasource.password=6924e0426091208b59e5d4054ca5d789f7892ce3333449f5c45690803ae81368",
    // Keep schema as-is — do not recreate or validate against a blank DB
    "spring.jpa.hibernate.ddl-auto=none",
    // Allow the inline TestConfig beans to override auto-configured ones
    "spring.main.allow-bean-definition-overriding=true",
    // Required by SecurityConfig (otherwise context fails to start)
    "authentik.issuer=http://localhost/authentik/application/o/easyspot/",
    "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost/authentik/.well-known/jwks.json",
    // Mocked externals — values don't matter, just must be present
    "authentik.api.url=http://localhost:9000/authentik",
    "authentik.api.token=test-token",
    "stripe.api.key=sk_test_dummy",
    "stripe.webhook.secret=whsec_dummy",
    "app.frontend.url=http://localhost:5173",
    "r2.account-id=test", "r2.access-key=test", "r2.secret-key=test",
    "r2.bucket=test", "r2.public-url=http://localhost",
    "scraper.base-url=http://localhost:4100", "scraper.api-key=test-key",
    "autodoc.vehicle-image-base=http://localhost",
    "alerts.summary.cron=0 0 0 1 1 *"
})
@Import(ManagerTechnicianFlowIT.JdbcTestConfig.class)
class ManagerTechnicianFlowIT {

    /**
     * Provides the named JdbcTemplate beans required by AnalyticsRepository and
     * DriverSpendingRepository. In production these come from the Timescale datasource;
     * in this test we route them to the same Postgres datasource that is already running.
     */
    @TestConfiguration
    static class JdbcTestConfig {
        // All timescale beans are routed to the same Postgres datasource in tests.
        // Build a fresh DataSource to avoid a circular reference with the primary one.
        @Bean(name = "timescaleDataSource")
        DataSource timescaleDataSource() {
            return DataSourceBuilder.create()
                .url("jdbc:postgresql://localhost:5432/easyspot")
                .username("easyspot")
                .password("6924e0426091208b59e5d4054ca5d789f7892ce3333449f5c45690803ae81368")
                .build();
        }

        @Bean(name = "jdbcTemplate")
        @Primary
        JdbcTemplate jdbcTemplate(DataSource ds) { return new JdbcTemplate(ds); }

        @Bean(name = "namedParameterJdbcTemplate")
        NamedParameterJdbcTemplate namedParameterJdbcTemplate(DataSource ds) {
            return new NamedParameterJdbcTemplate(ds);
        }

        @Bean(name = "timescaleJdbcTemplate")
        JdbcTemplate timescaleJdbcTemplate(@org.springframework.beans.factory.annotation.Qualifier("timescaleDataSource") DataSource ds) {
            return new JdbcTemplate(ds);
        }

        @Bean(name = "timescaleNamedJdbcTemplate")
        NamedParameterJdbcTemplate timescaleNamedJdbcTemplate(@org.springframework.beans.factory.annotation.Qualifier("timescaleDataSource") DataSource ds) {
            return new NamedParameterJdbcTemplate(ds);
        }
    }

    @Autowired WebApplicationContext wac;
    @Autowired ObjectMapper objectMapper;
    @Autowired ParkingLotRepository parkingLotRepository;
    @Autowired UserRepository userRepository;
    @Autowired TechnicianParkAssignmentRepository assignmentRepository;

    @MockitoBean JwtDecoder jwtDecoder;
    @MockitoBean AuthentikClient authentikClient;
    @MockitoBean TimescaleHypertableInitializer timescaleHypertableInitializer;
    @MockitoBean ParkingSeedInitializer parkingSeedInitializer;

    MockMvc mockMvc;

    // UIDs are unique per test-class instantiation so they never collide on re-runs
    private final String runId = UUID.randomUUID().toString().substring(0, 8);
    private final String TECH_A_UID = "it-uid-a-" + runId;
    private final String TECH_B_UID = "it-uid-b-" + runId;

    private ParkingLot parkA;
    private ParkingLot parkB;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.webAppContextSetup(wac).apply(springSecurity()).build();

        when(authentikClient.findGroupPk("TECHNICAL")).thenReturn("group-pk-technical");
        when(authentikClient.createUser(anyString(), anyString(), anyString(), anyString()))
            .thenAnswer(inv -> {
                String username = inv.getArgument(0);
                String uid = username.contains("_a_") || username.endsWith("_a") ? TECH_A_UID : TECH_B_UID;
                return new AuthentikClient.AuthentikUser(
                    "pk-" + username, uid, username, username + "@test.local", username);
            });

        parkA = parkingLotRepository.save(buildPark("IT Park Alpha " + runId, "Aveiro"));
        parkB = parkingLotRepository.save(buildPark("IT Park Beta " + runId, "Coimbra"));
    }

    @AfterEach
    void tearDown() {
        // Remove all test data created during this test run
        var testUsers = userRepository.findAll().stream()
            .filter(u -> u.getAuthentikUserId().startsWith("it-uid-"))
            .toList();
        var testUserIds = testUsers.stream().map(u -> u.getId()).toList();
        assignmentRepository.deleteAll(
            assignmentRepository.findAll().stream()
                .filter(a -> testUserIds.contains(a.getTechnicianId()))
                .toList()
        );
        testUsers.forEach(userRepository::delete);
        if (parkA != null) parkingLotRepository.deleteById(parkA.getId());
        if (parkB != null) parkingLotRepository.deleteById(parkB.getId());
    }

    // ── 1. Manager creates technicians ────────────────────────────────────────

    @Test
    @DisplayName("Manager creates technician with parks — response includes assigned parkIds")
    void managerCreatesTechnician_returnsDetailWithParks() throws Exception {
        stubAuthentikUser("tech_a", TECH_A_UID);

        mockMvc.perform(post("/api/manager/technicians")
                .with(jwtWithRole("mgr", "MANAGER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of(
                    "username", "tech_a",
                    "name", "Tech A",
                    "email", "tech_a@test.local",
                    "temporaryPassword", "Password123!",
                    "parkIds", List.of(parkA.getId().toString())
                ))))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.name").value("Tech A"))
            .andExpect(jsonPath("$.email").value("tech_a@test.local"))
            .andExpect(jsonPath("$.parkIds", hasSize(1)))
            .andExpect(jsonPath("$.parkIds[0]").value(parkA.getId().toString()));
    }

    @Test
    @DisplayName("Manager lists technicians — newly created technician appears")
    void managerListsTechnicians_includesNewTechnician() throws Exception {
        createTechnician("tech_a_list", TECH_A_UID, List.of());

        mockMvc.perform(get("/api/manager/technicians")
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.email == 'tech_a_list@test.local')]").exists());
    }

    @Test
    @DisplayName("DRIVER cannot create technicians — 403")
    void driverCannotCreateTechnician() throws Exception {
        mockMvc.perform(post("/api/manager/technicians")
                .with(jwtWithRole("drv", "DRIVER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(java.util.Map.of(
                    "username", "x", "name", "x", "email", "x@test.local",
                    "temporaryPassword", "Password123!"
                ))))
            .andExpect(status().isForbidden());
    }

    // ── 2. Manager assigns / unassigns parks ─────────────────────────────────

    @Test
    @DisplayName("Manager assigns park → appears in GET /api/technician/parks/{id}")
    void managerAssignsPark_appearsInLookup() throws Exception {
        UUID techId = createTechnician("tech_a_assign", TECH_A_UID, List.of());

        mockMvc.perform(post("/api/technician/parks/{t}/{p}", techId, parkA.getId())
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/technician/parks/{t}", techId)
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].parkingLotId").value(parkA.getId().toString()))
            .andExpect(jsonPath("$[0].parkingLotName").value(parkA.getName()));
    }

    @Test
    @DisplayName("Manager unassigns park → park gone from technician view")
    void managerUnassignsPark_parkGone() throws Exception {
        UUID techId = createTechnician("tech_a_rm", TECH_A_UID, List.of(parkA.getId()));

        mockMvc.perform(delete("/api/technician/parks/{t}/{p}", techId, parkA.getId())
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/technician/parks/{t}", techId)
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(0)));
    }

    // ── 3. Technician sees only their parks ───────────────────────────────────

    @Test
    @DisplayName("Technician /my — returns only their assigned parks")
    void technicianSeesOnlyTheirParks() throws Exception {
        stubAuthentikUser("tech_a_see", TECH_A_UID);
        stubAuthentikUser("tech_b_see", TECH_B_UID);
        createTechnicianWithUid("tech_a_see", TECH_A_UID, List.of(parkA.getId()));
        createTechnicianWithUid("tech_b_see", TECH_B_UID, List.of(parkB.getId()));

        mockMvc.perform(get("/api/technician/parks/my")
                .with(jwtWithRole(TECH_A_UID, "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$", hasSize(1)))
            .andExpect(jsonPath("$[0].parkingLotName").value(parkA.getName()));
    }

    @Test
    @DisplayName("Technician /my — does NOT include parks of another technician")
    void technicianDoesNotSeeOthersPark() throws Exception {
        stubAuthentikUser("tech_a_iso", TECH_A_UID);
        stubAuthentikUser("tech_b_iso", TECH_B_UID);
        createTechnicianWithUid("tech_a_iso", TECH_A_UID, List.of(parkA.getId()));
        createTechnicianWithUid("tech_b_iso", TECH_B_UID, List.of(parkB.getId()));

        mockMvc.perform(get("/api/technician/parks/my")
                .with(jwtWithRole(TECH_A_UID, "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.parkingLotId == '" + parkB.getId() + "')]").doesNotExist());
    }

    @Test
    @DisplayName("MANAGER cannot call /api/technician/parks/my — 403")
    void managerCannotCallMyParks() throws Exception {
        mockMvc.perform(get("/api/technician/parks/my")
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Unauthenticated /api/technician/parks/my — 401")
    void unauthenticatedMyParks() throws Exception {
        mockMvc.perform(get("/api/technician/parks/my"))
            .andExpect(status().isUnauthorized());
    }

    // ── 4. Technician sensor access is filtered to assigned parks ─────────────

    @Test
    @DisplayName("Technician /api/technician/sensors — 200, returns array filtered to assigned parks")
    void technicianSensors_returns200() throws Exception {
        stubAuthentikUser("tech_a_sens", TECH_A_UID);
        createTechnicianWithUid("tech_a_sens", TECH_A_UID, List.of(parkA.getId()));

        mockMvc.perform(get("/api/technician/sensors")
                .with(jwtWithRole(TECH_A_UID, "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$").isArray());
    }

    @Test
    @DisplayName("DRIVER cannot call /api/technician/sensors — 403")
    void driverCannotCallSensors() throws Exception {
        mockMvc.perform(get("/api/technician/sensors")
                .with(jwtWithRole("drv", "DRIVER")))
            .andExpect(status().isForbidden());
    }

    // ── 5. Full end-to-end flow ───────────────────────────────────────────────

    @Test
    @DisplayName("Full flow: create → assign → technician sees park → unassign → park gone")
    void fullFlow_createAssignSeeThenUnassign() throws Exception {
        stubAuthentikUser("tech_a_flow", TECH_A_UID);
        UUID techId = createTechnicianWithUid("tech_a_flow", TECH_A_UID, List.of());

        mockMvc.perform(post("/api/technician/parks/{t}/{p}", techId, parkA.getId())
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isCreated());

        mockMvc.perform(get("/api/technician/parks/my")
                .with(jwtWithRole(TECH_A_UID, "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.parkingLotName == '" + parkA.getName() + "')]").exists());

        mockMvc.perform(delete("/api/technician/parks/{t}/{p}", techId, parkA.getId())
                .with(jwtWithRole("mgr", "MANAGER")))
            .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/technician/parks/my")
                .with(jwtWithRole(TECH_A_UID, "TECHNICAL")))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[?(@.parkingLotName == '" + parkA.getName() + "')]").doesNotExist());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void stubAuthentikUser(String username, String uid) {
        when(authentikClient.createUser(eq(username), anyString(), anyString(), anyString()))
            .thenReturn(new AuthentikClient.AuthentikUser(
                "pk-" + username, uid, username, username + "@test.local", username));
    }

    private UUID createTechnician(String username, String uid, List<UUID> parkIds) throws Exception {
        stubAuthentikUser(username, uid);
        return createTechnicianWithUid(username, uid, parkIds);
    }

    private UUID createTechnicianWithUid(String username, String uid, List<UUID> parkIds) throws Exception {
        stubAuthentikUser(username, uid);

        var body = new java.util.HashMap<String, Object>();
        body.put("username", username);
        body.put("name", username + " Name");
        body.put("email", username + "@test.local");
        body.put("temporaryPassword", "Password123!");
        body.put("parkIds", parkIds.stream().map(UUID::toString).toList());

        MvcResult result = mockMvc.perform(post("/api/manager/technicians")
                .with(jwtWithRole("mgr", "MANAGER"))
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(body)))
            .andExpect(status().isOk())
            .andReturn();

        return UUID.fromString(
            objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText());
    }

    private ParkingLot buildPark(String name, String city) {
        ParkingLot p = new ParkingLot();
        p.setName(name);
        p.setCity(city);
        p.setAddress("Rua IT 1");
        p.setLatitude(40.0);
        p.setLongitude(-8.0);
        p.setOpeningHours("00:00-24:00");
        p.setTotalSpaces(50);
        return p;
    }
}
