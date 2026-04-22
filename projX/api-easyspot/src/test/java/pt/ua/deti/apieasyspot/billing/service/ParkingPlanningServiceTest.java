package pt.ua.deti.apieasyspot.billing.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningRequest;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningRequest.LocationRequest;
import pt.ua.deti.apieasyspot.billing.dto.ParkingPlanningRequest.OrderBy;

import java.math.BigDecimal;
import java.util.List;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParkingPlanningServiceTest {

    @Mock private JdbcTemplate jdbc;
    @Mock private NamedParameterJdbcTemplate namedJdbc;
    @InjectMocks private ParkingPlanningService service;

    private ParkingPlanningService.LotCandidate availableLot;
    private ParkingPlanningService.LotCandidate fullLot;
    private ParkingPlanningService.LotCandidate cheapLot;
    private ParkingPlanningService.LotCandidate nearLot;

    @BeforeEach
    void setUp() {
        availableLot = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Central Park", "Rua A", "08:00-22:00",
            500.0, BigDecimal.valueOf(1.20), 20, 100, 20, false, false, List.of());
        fullLot = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Full Park", "Rua B", "08:00-22:00",
            300.0, BigDecimal.valueOf(0.80), 100, 100, 100, false, false, List.of());
        cheapLot = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Cheap Park", "Rua C", "24h",
            1200.0, BigDecimal.valueOf(0.50), 30, 100, 30, false, false, List.of());
        nearLot = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Near Park", "Rua D", "24h",
            100.0, BigDecimal.valueOf(2.00), 40, 100, 40, false, false, List.of());
    }

    // --- isOpen tests ---

    @Test
    void isOpen_24h_returnsTrue() {
        assertThat(service.isOpen("24h", UUID.randomUUID())).isTrue();
    }

    @Test
    void isOpen_247_returnsTrue() {
        assertThat(service.isOpen("24/7", UUID.randomUUID())).isTrue();
    }

    @Test
    void isOpen_null_returnsTrue() {
        assertThat(service.isOpen(null, UUID.randomUUID())).isTrue();
    }

    @Test
    void isOpen_blank_returnsTrue() {
        assertThat(service.isOpen("  ", UUID.randomUUID())).isTrue();
    }

    @Test
    void isOpen_unparseable_returnsTrue() {
        assertThat(service.isOpen("manhã-tarde", UUID.randomUUID())).isTrue();
    }

    @Test
    void isOpen_fullDayRange_returnsTrue() {
        assertThat(service.isOpen("00:00-23:59", UUID.randomUUID())).isTrue();
    }

    @Test
    void isOpen_overnightSchedule_openDuringNightHours() {
        ParkingPlanningService spy = Mockito.spy(service);
        doReturn(23 * 60).when(spy).nowMinutesOfDay(); // 23:00 → inside 22:00–06:00
        assertThat(spy.isOpen("22:00-06:00", UUID.randomUUID())).isTrue();
    }

    @Test
    void isOpen_overnightSchedule_closedDuringDayHours() {
        ParkingPlanningService spy = Mockito.spy(service);
        doReturn(12 * 60).when(spy).nowMinutesOfDay(); // 12:00 → outside 22:00–06:00
        assertThat(spy.isOpen("22:00-06:00", UUID.randomUUID())).isFalse();
    }

    // --- score tests ---

    @Test
    void score_highAvailability_lowPrice_nearDistance_highScore() {
        var best = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Best", "Addr", "24h",
            100.0, BigDecimal.valueOf(0.50), 5, 100, 5, false, false, List.of());
        assertThat(service.score(best, 5000.0)).isGreaterThan(0.8);
    }

    @Test
    void score_highOccupancy_highPrice_far_lowScore() {
        var worst = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Worst", "Addr", "24h",
            4900.0, BigDecimal.valueOf(4.90), 95, 100, 95, false, false, List.of());
        assertThat(service.score(worst, 5000.0)).isLessThan(0.3);
    }

    @Test
    void score_nullPrice_scoreHigherThanExpensiveLot() {
        var noPrice = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Free", "Addr", "24h",
            500.0, null, 10, 100, 10, false, false, List.of());
        var pricey = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Pricey", "Addr", "24h",
            500.0, BigDecimal.valueOf(3.00), 10, 100, 10, false, false, List.of());
        assertThat(service.score(noPrice, 5000.0)).isGreaterThan(service.score(pricey, 5000.0));
    }

    @Test
    void score_twoLotsProduceDifferentValues() {
        assertThat(service.score(availableLot, 5000.0)).isNotEqualTo(service.score(nearLot, 5000.0));
    }

    // --- plan filtering tests ---

    @Test
    void plan_filtersFullLots() {
        stubCandidates(List.of(availableLot, fullLot));
        var response = service.plan(req("Aveiro", 60, null, null, 5000.0, OrderBy.BEST));
        assertThat(response.recommendations()).hasSize(1);
        assertThat(response.recommendations().get(0).name()).isEqualTo("Central Park");
    }

    @Test
    void plan_filtersOutOfRange() {
        var farLot = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Far Park", "Rua Z", "24h",
            6000.0, BigDecimal.valueOf(1.00), 10, 100, 10, false, false, List.of());
        stubCandidates(List.of(availableLot, farLot));
        var response = service.plan(req("Aveiro", 60, null, null, 1000.0, OrderBy.NEAREST));
        assertThat(response.recommendations()).hasSize(1);
        assertThat(response.recommendations().get(0).name()).isEqualTo("Central Park");
    }

    @Test
    void plan_filtersByEv_whenRequested() {
        var evLot = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "EV Park", "Rua EV", "24h",
            400.0, BigDecimal.valueOf(1.50), 10, 100, 10, true, false, List.of());
        stubCandidates(List.of(availableLot, evLot));
        var response = service.plan(req("Aveiro", 60, Boolean.TRUE, null, 5000.0, OrderBy.NEAREST));
        assertThat(response.recommendations()).hasSize(1);
        assertThat(response.recommendations().get(0).name()).isEqualTo("EV Park");
    }

    @Test
    void plan_filtersByAccessible_whenRequested() {
        var accLot = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Acc Park", "Rua Acc", "24h",
            400.0, BigDecimal.valueOf(1.00), 5, 100, 5, false, true, List.of());
        stubCandidates(List.of(availableLot, accLot));
        var response = service.plan(req("Aveiro", 60, null, Boolean.TRUE, 5000.0, OrderBy.NEAREST));
        assertThat(response.recommendations()).hasSize(1);
        assertThat(response.recommendations().get(0).name()).isEqualTo("Acc Park");
    }

    @Test
    void plan_orderByLowestPrice_sortsCorrectly() {
        stubCandidates(List.of(availableLot, cheapLot));
        var recs = service.plan(req("Aveiro", 60, null, null, 5000.0, OrderBy.LOWEST_PRICE)).recommendations();
        assertThat(recs.get(0).pricePerHour()).isLessThanOrEqualTo(recs.get(1).pricePerHour());
    }

    @Test
    void plan_orderByNearest_sortsCorrectly() {
        stubCandidates(List.of(cheapLot, nearLot));
        var recs = service.plan(req("Aveiro", 60, null, null, 5000.0, OrderBy.NEAREST)).recommendations();
        assertThat(recs.get(0).distanceMeters()).isLessThanOrEqualTo(recs.get(1).distanceMeters());
    }

    @Test
    void plan_emptyResult_whenNoLotsMatch() {
        stubCandidates(List.of());
        var response = service.plan(req("UnknownCity", 60, null, null, 5000.0, OrderBy.BEST));
        assertThat(response.recommendations()).isEmpty();
    }

    @Test
    void plan_defaultOrderBy_isBest() {
        var r = new ParkingPlanningRequest("Aveiro", 60, null, null, 5000.0,
            new LocationRequest(40.6, -8.6), null);
        assertThat(r.effectiveOrderBy()).isEqualTo(OrderBy.BEST);
    }

    @Test
    void plan_occupancyStatus_AVAILABLE_under90pct() {
        stubCandidates(List.of(availableLot)); // 20%
        var occ = service.plan(req("Aveiro", 60, null, null, 5000.0, OrderBy.BEST))
            .recommendations().get(0).currentOccupancy();
        assertThat(occ.status()).isEqualTo("AVAILABLE");
    }

    @Test
    void plan_occupancyStatus_LIMITED_at92pct() {
        var limited = new ParkingPlanningService.LotCandidate(
            UUID.randomUUID(), "Limited", "Rua L", "24h",
            200.0, BigDecimal.valueOf(1.00), 92, 100, 92, false, false, List.of());
        stubCandidates(List.of(limited));
        var occ = service.plan(req("Aveiro", 60, null, null, 5000.0, OrderBy.BEST))
            .recommendations().get(0).currentOccupancy();
        assertThat(occ.status()).isEqualTo("LIMITED");
    }

    @Test
    void plan_summaryContainsExpectedFields() {
        stubCandidates(List.of(availableLot));
        var s = service.plan(req("Aveiro", 60, null, null, 5000.0, OrderBy.BEST))
            .recommendations().get(0);
        assertThat(s.id()).isNotNull();
        assertThat(s.name()).isEqualTo("Central Park");
        assertThat(s.address()).isEqualTo("Rua A");
        assertThat(s.openingHours()).isEqualTo("08:00-22:00");
        assertThat(s.distanceMeters()).isEqualTo(500.0);
        assertThat(s.pricePerHour()).isEqualTo(BigDecimal.valueOf(1.20));
        assertThat(s.currentOccupancy().occupied()).isEqualTo(20);
        assertThat(s.currentOccupancy().total()).isEqualTo(100);
        assertThat(s.currentOccupancy().occupancyPercent()).isEqualTo(20);
        assertThat(s.occupancyByHour()).isEmpty();
    }

    // --- helpers ---

    @SuppressWarnings({"unchecked", "rawtypes"})
    private void stubCandidates(List<ParkingPlanningService.LotCandidate> candidates) {
        when(jdbc.query(anyString(), (RowMapper) any(RowMapper.class), any(Object[].class)))
            .thenReturn((List) candidates);
    }

    private ParkingPlanningRequest req(String city, int duration,
                                       Boolean ev, Boolean acc,
                                       double maxDist, OrderBy orderBy) {
        return new ParkingPlanningRequest(city, duration, ev, acc, maxDist,
            new LocationRequest(40.6405, -8.6538), orderBy);
    }
}
