package pt.ua.deti.apieasyspot.technician.service;


import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.technician.dto.TechnicianDashboardResponse;
import pt.ua.deti.apieasyspot.technician.dto.TechnicianKpiSummary;
import pt.ua.deti.apieasyspot.technician.repository.TechnicianRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
@RequiredArgsConstructor
public class TechnicianService {

    private final TechnicianRepository technicianRepository;

    public TechnicianDashboardResponse buildDashboard() {
        int total = technicianRepository.countTotalSensors();
        int operational = technicianRepository.countOperationalSensors();
        long failuresToday = technicianRepository.countFailuresToday();
        long failuresYesterday = technicianRepository.countFailuresYesterday();
        Double currentMttr = technicianRepository.avgMttrCurrentWeekMinutes();
        Double historicalMttr = technicianRepository.avgMttrHistoricalMinutes();

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
            technicianRepository.uptimeLast7Days(),
            technicianRepository.sensorDistribution(),
            technicianRepository.urgentWorkOrders()
        );
    }

    double percentChange(Double previous, Double current){
        if(previous == null || previous == 0.0) return 0.0;
        if(current == null) return 0.0;

        return BigDecimal.valueOf(current - previous)
            .multiply(BigDecimal.valueOf(100))
            .divide(BigDecimal.valueOf(previous), 1, RoundingMode.HALF_UP)
            .doubleValue();
    }

    double percentChange(Long previous, long current){
        return percentChange((double) previous, (double) current);
    }

    double safeRate(int part, int total){
        if(total == 0) return 0;
        return Math.round(part * 100.0 / total) / 10.0;
    }

    String formatMttr(Double minutes){
        if(minutes == null) return "N/A";
        int h = (int) (minutes/60);
        int m = (int) (minutes%60);
        return String.format("%dh %02dm", h, m);
    }
}

