package pt.ua.deti.apieasyspot.analytics.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.analytics.dto.TechnicianDashboardResponse;
import pt.ua.deti.apieasyspot.analytics.dto.TechnicianKpiSummary;
import pt.ua.deti.apieasyspot.analytics.repository.TechnicianRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TechnicianService {

    private final TechnicianRepository technicianRepository;

    public TechnicianDashboardResponse buildDashboard(List<UUID> parkIds) {
        int total = technicianRepository.countTotalSensors(parkIds);
        int operational = technicianRepository.countOperationalSensors(parkIds);
        long failuresToday = technicianRepository.countFailuresToday(parkIds);
        long failuresYesterday = technicianRepository.countFailuresYesterday(parkIds);
        Double currentMttr = technicianRepository.avgMttrCurrentWeekMinutes(parkIds);
        Double historicalMttr = technicianRepository.avgMttrHistoricalMinutes(parkIds);

        TechnicianKpiSummary kpis = new TechnicianKpiSummary(
            total,
            operational,
            safeRate(operational, total),
            failuresToday,
            percentChange(failuresYesterday, failuresToday),
            formatMttr(currentMttr),
            percentChange(historicalMttr, currentMttr)
        );

        return new TechnicianDashboardResponse(
            kpis,
            technicianRepository.uptimeLast7Days(parkIds),
            technicianRepository.sensorDistribution(parkIds),
            technicianRepository.urgentWorkOrders(parkIds)
        );
    }

    double percentChange(Double previous, Double current) {
        if (previous == null || previous == 0.0) return 0.0;
        if (current == null) return 0.0;
        return BigDecimal.valueOf(current - previous)
            .multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(previous), 1, RoundingMode.HALF_UP)
            .doubleValue();
    }

    double percentChange(long previous, long current) {
        return percentChange((double) previous, (double) current);
    }

    double safeRate(int part, int total) {
        if (total == 0) return 0.0;
        return Math.round(part * 1000.0 / total) / 10.0;
    }

    String formatMttr(Double minutes) {
        if (minutes == null) return "N/A";
        int h = (int) (minutes / 60);
        int m = (int) (minutes % 60);
        return String.format("%dh %02dm", h, m);
    }
}
