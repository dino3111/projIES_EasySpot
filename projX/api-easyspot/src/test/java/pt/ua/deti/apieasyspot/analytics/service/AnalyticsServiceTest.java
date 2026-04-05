package pt.ua.deti.apieasyspot.analytics.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.analytics.dto.ManagerDashboardResponse;
import pt.ua.deti.apieasyspot.analytics.repository.AnalyticsRepository;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private AnalyticsRepository analyticsRepository;

    private AnalyticsService service;

    @BeforeEach
    void setUp() {
        service = new AnalyticsService(analyticsRepository);
    }

    @Test
    @DisplayName("percentChange returns 0 when previous is zero (safe division)")
    void percentChange_zeroPrevious_returnsZero() {
        assertThat(service.percentChange(BigDecimal.ZERO, BigDecimal.valueOf(100))).isEqualTo(0.0);
    }

    @ParameterizedTest
    @CsvSource({"100, 150, 50.0", "200, 180, -10.0", "50, 75, 50.0"})
    @DisplayName("percentChange calculates correctly for normal values")
    void percentChange_normalValues_calculatesCorrectly(long prev, long curr, double expected) {
        double result = service.percentChange(BigDecimal.valueOf(prev), BigDecimal.valueOf(curr));
        assertThat(result).isEqualTo(expected);
    }

    @Test
    @DisplayName("safeRate returns 0 when total is zero")
    void safeRate_zeroTotal_returnsZero() {
        assertThat(service.safeRate(50, 0)).isEqualTo(0);
    }

    @Test
    @DisplayName("safeRate rounds correctly")
    void safeRate_roundsToNearestInteger() {
        assertThat(service.safeRate(69, 100)).isEqualTo(69);
        assertThat(service.safeRate(1, 3)).isEqualTo(33);
    }

    @Test
    @DisplayName("formatDuration returns '0h 00m' when null")
    void formatDuration_null_returnsZero() {
        assertThat(service.formatDuration(null)).isEqualTo("0h 00m");
    }

    @ParameterizedTest
    @CsvSource({"134.0, '2h 14m'", "60.0, '1h 00m'", "45.0, '0h 45m'"})
    @DisplayName("formatDuration formats minutes correctly")
    void formatDuration_formatsCorrectly(double minutes, String expected) {
        assertThat(service.formatDuration(minutes)).isEqualTo(expected);
    }

    @Test
    @DisplayName("buildDashboard returns response with all sections populated")
    void buildDashboard_returnsCompleteResponse() {
        when(analyticsRepository.countEntriesToday()).thenReturn(120L);
        when(analyticsRepository.countEntriesYesterday()).thenReturn(100L);
        when(analyticsRepository.revenueToday()).thenReturn(BigDecimal.valueOf(500));
        when(analyticsRepository.revenueYesterday()).thenReturn(BigDecimal.valueOf(400));
        when(analyticsRepository.avgSessionDurationMinutes()).thenReturn(90.0);
        when(analyticsRepository.countOpenAlerts()).thenReturn(3L);
        when(analyticsRepository.currentOccupancy()).thenReturn(new int[]{700, 1000});
        when(analyticsRepository.countActiveLots()).thenReturn(3);
        when(analyticsRepository.last7DaysMetrics()).thenReturn(List.of());
        when(analyticsRepository.zoneOccupancy()).thenReturn(List.of());
        when(analyticsRepository.hourlyOccupancy()).thenReturn(List.of());
        when(analyticsRepository.last5Alerts()).thenReturn(List.of());
        when(analyticsRepository.parkPerformance()).thenReturn(List.of());

        ManagerDashboardResponse response = service.buildDashboard();

        assertThat(response.kpis().todayEntrances()).isEqualTo(120L);
        assertThat(response.kpis().entranceVariance()).isEqualTo(20.0);
        assertThat(response.kpis().averageOccupancy()).isEqualTo(70);
        assertThat(response.kpis().averageOccupancyTime()).isEqualTo("1h 30m");
        assertThat(response.kpis().alertsOpened()).isEqualTo(3L);
    }
}
