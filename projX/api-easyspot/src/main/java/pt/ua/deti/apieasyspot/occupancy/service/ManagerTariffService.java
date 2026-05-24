package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ForbiddenException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.TariffResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.UpdateTariffRequest;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffAudit;
import pt.ua.deti.apieasyspot.occupancy.model.ParkStatus;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffAuditRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ManagerTariffService {

    private final TariffRepository tariffRepository;
    private final TariffAuditRepository tariffAuditRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final TimescaleParkingSessionRepository parkingSessionRepository;

    @Transactional(readOnly = true)
    public Page<TariffResponse> listTariffs(UUID parkId, String district, ParkStatus parkStatus, Pageable pageable) {
        String districtFilter = (district == null || district.isBlank()) ? null : district.trim();
        return tariffRepository.findFiltered(parkId, districtFilter, parkStatus, pageable)
            .map(this::mapToResponse);
    }

    @Transactional
    public TariffResponse updateTariff(UpdateTariffRequest request, String managerId) {
        requireManagerId(managerId);
        validateActivePricing(request);

        ParkingLot park = parkingLotRepository.findByIdWithLock(request.parkId())
            .orElseThrow(() -> new ResourceNotFoundException("Parking lot not found"));

        validateNoActiveSessions(request.parkId());

        Tariff tariff = tariffRepository.findFirstByParkingLotIdOrderByIdAsc(request.parkId())
            .orElseGet(() -> newDefaultTariff(park));

        applyUpdate(tariff, request);

        Tariff savedTariff = tariffRepository.save(tariff);
        saveAudit(savedTariff, managerId);

        log.info("Tariff updated for parking lot {} by manager {}", request.parkId(), managerId);
        return mapToResponse(savedTariff);
    }

    private void requireManagerId(String managerId) {
        if (managerId == null || managerId.isBlank()) {
            throw new ForbiddenException("Manager ID is required");
        }
    }

    private void validateActivePricing(UpdateTariffRequest request) {
        if (request.status() == TariffStatus.ACTIVE &&
                request.pricePerHour().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Active tariffs must have a positive price per hour");
        }
    }

    private void validateNoActiveSessions(UUID parkingLotId) {
        long activeSessionCount = parkingSessionRepository.countActiveByParkingLotId(parkingLotId);
        if (activeSessionCount > 0) {
            throw new ConflictException(
                String.format("Cannot update tariff. %d active parking session(s) in progress for this parking lot.",
                    activeSessionCount)
            );
        }
    }

    private Tariff newDefaultTariff(ParkingLot park) {
        Tariff tariff = new Tariff();
        tariff.setParkingLot(park);
        tariff.setName("Default Tariff");
        return tariff;
    }

    private void applyUpdate(Tariff tariff, UpdateTariffRequest request) {
        tariff.setPricePerHour(request.pricePerHour());
        tariff.setMaxDaily(request.maxDaily());
        tariff.setMonthly(request.monthlyPrice());
        tariff.setPricePerKwh(request.pricePerKwh());
        tariff.setStatus(request.status());
    }

    private void saveAudit(Tariff tariff, String managerId) {
        TariffAudit audit = new TariffAudit();
        audit.setTariffId(tariff.getId());
        audit.setParkingLotId(tariff.getParkingLot().getId());
        audit.setPricePerHour(tariff.getPricePerHour());
        audit.setMaxDaily(tariff.getMaxDaily());
        audit.setMonthly(tariff.getMonthly());
        audit.setPricePerKwh(tariff.getPricePerKwh());
        audit.setStatus(tariff.getStatus());
        audit.setChangedBy(managerId);
        tariffAuditRepository.save(audit);
    }

    private TariffResponse mapToResponse(Tariff t) {
        return new TariffResponse(
            t.getId(),
            t.getParkingLot().getId(),
            t.getParkingLot().getName(),
            t.getParkingLot().getCity(),
            t.getPricePerHour(),
            t.getMaxDaily(),
            t.getMonthly(),
            t.getPricePerKwh(),
            t.getStatus(),
            t.getParkingLot().getStatus()
        );
    }
}
