package pt.ua.deti.apieasyspot.analytics.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.analytics.dto.KpiSummary;
import pt.ua.deti.apieasyspot.analytics.dto.ManagerDashboardResponse;
import pt.ua.deti.apieasyspot.analytics.repository.AnalyticsRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final AnalyticsRepository analyticsRepository;

    public ManagerDashboardResponse buildDashboard(){
        long todayEntries= analyticsRepository.countEntriesToday();
        long yesterdayEntries = analyticsRepository.countEntriesYesterday();

        BigDecimal todayRevenue = analyticsRepository.revenueToday();
        BigDecimal yesterdayRevenue = analyticsRepository.revenueYesterday();

        int[] occupancy = analyticsRepository.currentOccupancy();

        KpiSummary kpis = new KpiSummary(
            todayEntries,
            percentChange(BigDecimal.valueOf(yesterdayEntries), BigDecimal.valueOf(todayEntries)),
            safeRate(occupancy[0], occupancy[1]),
            occupancy[1],
            occupancy[0],
            todayRevenue,
            percentChange(yesterdayRevenue, todayRevenue),
            formatDuration(analyticsRepository.avgSessionDurationMinutes()),
            analyticsRepository.countOpenAlerts(),
            analyticsRepository.countActiveLots()
        );
        return new ManagerDashboardResponse(
            kpis,
            analyticsRepository.last7DaysMetrics(),
            analyticsRepository.zoneOccupancy(),
            analyticsRepository.hourlyOccupancy(),
            analyticsRepository.last5Alerts(),
            analyticsRepository.parkPerformance()
        );
    }

    double percentChange(BigDecimal previous, BigDecimal current){
        if(previous.compareTo(BigDecimal.ZERO) == 0) return 0.0;
        return current.subtract(previous)
            .multiply(BigDecimal.valueOf(100))
            .divide(previous, 1, RoundingMode.HALF_UP)
            .doubleValue();
    }

    int safeRate(int part, int total){
        if(total == 0) return 0;
        return (int) Math.round(part * 100.0 / total);
    }

    String formatDuration(Double minutes){
        if(minutes == null) return "0h 00m";
        int h = (int) (minutes/60);
        int m = (int) (minutes%60);
        return String.format("%dh %02dm", h, m);
    }
}
