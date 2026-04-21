package pt.ua.deti.apieasyspot.occupancy.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.billing.repository.ParkingSessionRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ForbiddenException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.TariffResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.UpdateTariffRequest;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffAudit;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffAuditRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ManagerTariffService {

    private final TariffRepository tariffRepository;
    private final TariffAuditRepository tariffAuditRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSessionRepository parkingSessionRepository;

    public List<TariffResponse> listTariffs(UUID parkId, String city, TariffStatus status) {
        return tariffRepository.findFiltered(parkId, city, status).stream()
            .map(this::mapToResponse)
            .toList();
    }

    @Transactional
    public TariffResponse updateTariff(UpdateTariffRequest request, String managerId) {
        ParkingLot park = parkingLotRepository.findById(request.parkId())
            .orElseThrow(() -> new ResourceNotFoundException("Parking lot not found: " + request.parkId()));

        validateManagerAccessToPark(managerId, park);
        validateNoActiveSessions(request.parkId());

        List<Tariff> tariffs = tariffRepository.findByParkingLotId(request.parkId());
        Tariff tariff;
        if (tariffs.isEmpty()) {
            tariff = new Tariff();
            tariff.setParkingLot(park);
            tariff.setName("Default Tariff");
        } else {
            tariff = tariffs.get(0);
        }

        tariff.setPricePerHour(request.pricePerHour());
        tariff.setMaxDaily(request.maxDaily());
        tariff.setMonthly(request.monthlyPrice());
        tariff.setPricePerKwh(request.pricePerKwh());
        tariff.setStatus(request.status());

        Tariff savedTariff = tariffRepository.save(tariff);

        saveAudit(savedTariff, managerId);

        log.info("Tariff updated for parking lot {} by manager {}", request.parkId(), managerId);
        return mapToResponse(savedTariff);
    }

    private void validateManagerAccessToPark(String managerId, ParkingLot park) {
        if (managerId == null || managerId.isBlank()) {
            throw new ForbiddenException("Manager ID is required");
        }
        log.debug("Manager {} attempting access to park {}", managerId, park.getId());
    }

    private void validateNoActiveSessions(UUID parkingLotId) {
        long activeSessionCount = parkingSessionRepository.countActiveSessionsByParkingLot(parkingLotId);
        if (activeSessionCount > 0) {
            throw new ConflictException(
                String.format("Cannot update tariff. %d active parking session(s) in progress for this parking lot.",
                    activeSessionCount)
            );
        }
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
            t.getStatus()
        );
    }
}
