package pt.ua.deti.apieasyspot.analytics.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.analytics.dto.TechnicianDashboardResponse;
import pt.ua.deti.apieasyspot.analytics.repository.TechnicianRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TechnicianServiceTest {

    @Mock
    private TechnicianRepository technicianRepository;

    private TechnicianService service;

    @BeforeEach
    void setUp() {
        service = new TechnicianService(technicianRepository);
    }

    @Test
    @DisplayName("formatMttr returns 'N/A' when null")
    void formatMttr_null_returnsNA() {
        assertThat(service.formatMttr(null)).isEqualTo("N/A");
    }

    @ParameterizedTest
    @CsvSource({"90.0, '1h 30m'", "60.0, '1h 00m'", "45.0, '0h 45m'", "0.0, '0h 00m'"})
    @DisplayName("formatMttr formats minutes correctly")
    void formatMttr_formatsCorrectly(double minutes, String expected) {
        assertThat(service.formatMttr(minutes)).isEqualTo(expected);
    }

    @Test
    @DisplayName("percentChange returns 0 when previous is null")
    void percentChange_nullPrevious_returnsZero() {
        assertThat(service.percentChange((Double) null, 100.0)).isEqualTo(0.0);
    }

    @Test
    @DisplayName("percentChange returns 0 when previous is zero")
    void percentChange_zeroPrevious_returnsZero() {
        assertThat(service.percentChange(0.0, 100.0)).isEqualTo(0.0);
    }

    @Test
    @DisplayName("percentChange returns 0 when current is null")
    void percentChange_nullCurrent_returnsZero() {
        assertThat(service.percentChange(100.0, (Double) null)).isEqualTo(0.0);
    }

    @ParameterizedTest
    @CsvSource({"100.0, 150.0, 50.0", "200.0, 180.0, -10.0", "50.0, 75.0, 50.0"})
    @DisplayName("percentChange calculates correctly for normal values")
    void percentChange_normalValues_calculatesCorrectly(double prev, double curr, double expected) {
        assertThat(service.percentChange(prev, curr)).isEqualTo(expected);
    }

    @Test
    @DisplayName("safeRate returns 0.0 when total is zero")
    void safeRate_zeroTotal_returnsZero() {
        assertThat(service.safeRate(5, 0)).isEqualTo(0.0);
    }

    @Test
    @DisplayName("safeRate computes percentage with one decimal")
    void safeRate_returnsOneDecimalPrecision() {
        assertThat(service.safeRate(9, 12)).isEqualTo(75.0);
        assertThat(service.safeRate(1, 3)).isEqualTo(33.3);
    }

    @Test
    @DisplayName("buildDashboard returns response with all sections populated")
    void buildDashboard_returnsCompleteResponse() {
        when(technicianRepository.countTotalSensors()).thenReturn(12);
        when(technicianRepository.countOperationalSensors()).thenReturn(10);
        when(technicianRepository.countFailuresToday()).thenReturn(2L);
        when(technicianRepository.countFailuresYesterday()).thenReturn(1L);
        when(technicianRepository.avgMttrCurrentWeekMinutes()).thenReturn(90.0);
        when(technicianRepository.avgMttrHistoricalMinutes()).thenReturn(120.0);
        when(technicianRepository.uptimeLast7Days()).thenReturn(List.of());
        when(technicianRepository.sensorDistribution()).thenReturn(List.of());
        when(technicianRepository.urgentWorkOrders()).thenReturn(List.of());

        TechnicianDashboardResponse response = service.buildDashboard();

        assertThat(response.kpis().totalSensors()).isEqualTo(12);
        assertThat(response.kpis().operationalSensors()).isEqualTo(10);
        assertThat(response.kpis().uptimePct()).isEqualTo(83.3);
        assertThat(response.kpis().failuresToday()).isEqualTo(2L);
        assertThat(response.kpis().meanTimeToRepair()).isEqualTo("1h 30m");
        assertThat(response.uptimeLast7Days()).isEmpty();
        assertThat(response.sensorDistribution()).isEmpty();
        assertThat(response.urgentWorkOrders()).isEmpty();
    }

    @Test
    @DisplayName("buildDashboard handles zero sensors gracefully")
    void buildDashboard_zeroSensors_noArithmeticException() {
        when(technicianRepository.countTotalSensors()).thenReturn(0);
        when(technicianRepository.countOperationalSensors()).thenReturn(0);
        when(technicianRepository.countFailuresToday()).thenReturn(0L);
        when(technicianRepository.countFailuresYesterday()).thenReturn(0L);
        when(technicianRepository.avgMttrCurrentWeekMinutes()).thenReturn(null);
        when(technicianRepository.avgMttrHistoricalMinutes()).thenReturn(null);
        when(technicianRepository.uptimeLast7Days()).thenReturn(List.of());
        when(technicianRepository.sensorDistribution()).thenReturn(List.of());
        when(technicianRepository.urgentWorkOrders()).thenReturn(List.of());

        TechnicianDashboardResponse response = service.buildDashboard();

        assertThat(response.kpis().uptimePct()).isEqualTo(0.0);
        assertThat(response.kpis().meanTimeToRepair()).isEqualTo("N/A");
        assertThat(response.kpis().mttrVariancePct()).isEqualTo(0.0);
    }
}
