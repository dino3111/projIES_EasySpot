package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final TimescaleAlertRepository alertRepository;
    private final ParkingLotRepository parkingLotRepository;

    public List<Alert> listAlerts(UUID parkId, StateAlert state, SeverityAlert severity) {
        List<Alert> alerts = alertRepository.findAllFiltered(parkId, state, severity);
        hydrateClientReportAttribution(alerts);
        return alerts;
    }

    public void updateState(UUID id, String rawState, String notes) {
        Alert alert = alertRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));

        StateAlert newState = parseState(rawState);
        boolean becomingResolved = newState == StateAlert.RESOLVED && alert.getState() != StateAlert.RESOLVED;
        boolean leavingResolved = newState != StateAlert.RESOLVED && alert.getState() == StateAlert.RESOLVED;

        alert.setState(newState);
        if (notes != null && !notes.isBlank()) {
            alert.setNotes(notes);
        }
        if (becomingResolved) {
            alert.setResolvedAt(OffsetDateTime.now(ZoneOffset.UTC));
        } else if (leavingResolved) {
            alert.setResolvedAt(null);
        }

        alertRepository.save(alert);
    }

    private StateAlert parseState(String rawState) {
        if (rawState == null || rawState.isBlank()) {
            throw new IllegalArgumentException("State must not be blank");
        }
        try {
            return StateAlert.valueOf(rawState.toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid state: " + rawState);
        }
    }

    private void hydrateClientReportAttribution(List<Alert> alerts) {
        List<UUID> parkIds = alerts.stream()
            .filter(a -> a.getType() == AlertType.CLIENT && a.getParkingLotId() != null)
            .map(Alert::getParkingLotId)
            .distinct()
            .toList();

        if (parkIds.isEmpty()) {
            return;
        }

        Map<UUID, ParkingLot> lotsById = parkingLotRepository.findAllById(parkIds).stream()
            .collect(Collectors.toMap(ParkingLot::getId, p -> p));

        for (Alert alert : alerts) {
            if (alert.getType() != AlertType.CLIENT) {
                continue;
            }

            String currentAssigned = alert.getAttributedTo();
            if (alert.getReportedBy() == null || alert.getReportedBy().isBlank()) {
                alert.setReportedBy(currentAssigned);
            }

            ParkingLot lot = lotsById.get(alert.getParkingLotId());
            if (lot != null && lot.getTechnician() != null && lot.getTechnician().getName() != null) {
                alert.setAttributedTo(lot.getTechnician().getName());
            }
        }
    }
}
