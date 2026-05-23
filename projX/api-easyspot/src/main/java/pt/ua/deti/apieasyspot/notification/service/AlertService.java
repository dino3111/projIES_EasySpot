package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.occupancy.model.TechnicianParkAssignment;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;
import pt.ua.deti.apieasyspot.notification.repository.AlertStateHistoryRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TechnicianParkAssignmentRepository;

import java.sql.Timestamp;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import pt.ua.deti.apieasyspot.common.dto.PagedResponse;
import pt.ua.deti.apieasyspot.notification.dto.AlertStateHistoryEntry;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final TimescaleAlertRepository alertRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final TechnicianParkAssignmentRepository technicianParkAssignmentRepository;
    private final UserRepository userRepository;
    private final AlertStateHistoryRepository alertStateHistoryRepository;

    public List<Alert> listAlerts(UUID parkId, StateAlert state, SeverityAlert severity,
                                   OffsetDateTime from, OffsetDateTime to) {
        Timestamp tsFrom = from != null ? Timestamp.from(from.toInstant()) : null;
        Timestamp tsTo   = to   != null ? Timestamp.from(to.toInstant())   : null;
        List<Alert> alerts = alertRepository.findAllFiltered(parkId, state, severity, tsFrom, tsTo);
        hydrateClientReportAttribution(alerts);
        return alerts;
    }

    public PagedResponse<Alert> listAlertsPaged(UUID parkId, StateAlert state, SeverityAlert severity,
                                                 OffsetDateTime from, OffsetDateTime to, int page, int size) {
        Timestamp tsFrom = from != null ? Timestamp.from(from.toInstant()) : null;
        Timestamp tsTo   = to   != null ? Timestamp.from(to.toInstant())   : null;
        long total = alertRepository.countFiltered(parkId, state, severity, tsFrom, tsTo);
        List<Alert> alerts = alertRepository.findAllFilteredPaged(parkId, state, severity, tsFrom, tsTo, page * size, size);
        hydrateClientReportAttribution(alerts);
        return PagedResponse.of(alerts, total, page, size);
    }

    public List<Alert> listAlertsByParks(List<UUID> parkIds, StateAlert state, SeverityAlert severity,
                                          OffsetDateTime from, OffsetDateTime to) {
        Timestamp tsFrom = from != null ? Timestamp.from(from.toInstant()) : null;
        Timestamp tsTo   = to   != null ? Timestamp.from(to.toInstant())   : null;
        return alertRepository.findAllFilteredByParks(parkIds, state, severity, tsFrom, tsTo);
    }

    public PagedResponse<Alert> listAlertsByParksPaged(List<UUID> parkIds, StateAlert state, SeverityAlert severity,
                                                        OffsetDateTime from, OffsetDateTime to, int page, int size) {
        if (parkIds == null || parkIds.isEmpty()) return PagedResponse.of(List.of(), 0, page, size);
        Timestamp tsFrom = from != null ? Timestamp.from(from.toInstant()) : null;
        Timestamp tsTo   = to   != null ? Timestamp.from(to.toInstant())   : null;
        long total = alertRepository.countFilteredByParks(parkIds, state, severity, tsFrom, tsTo);
        List<Alert> alerts = alertRepository.findAllFilteredByParksPaged(parkIds, state, severity, tsFrom, tsTo, page * size, size);
        return PagedResponse.of(alerts, total, page, size);
    }

    public void updateState(UUID id, String rawState, String notes) {
        Alert alert = alertRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Alert not found: " + id));

        StateAlert newState = parseState(rawState);
        boolean becomingResolved = newState == StateAlert.RESOLVED && alert.getState() != StateAlert.RESOLVED;
        boolean leavingResolved = newState != StateAlert.RESOLVED && alert.getState() == StateAlert.RESOLVED;

        StateAlert previousState = alert.getState();
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
        alertStateHistoryRepository.save(
            alert.getId(),
            previousState != null ? previousState.name() : null,
            newState.name(),
            "manual",
            notes,
            Timestamp.from(OffsetDateTime.now(ZoneOffset.UTC).toInstant())
        );
    }

    public Alert createSensorAlert(UUID parkingLotId, String parkingLotName, String zone, String sensorId, String description, String notes, SeverityAlert severity) {
        Alert alert = new Alert();
        alert.setParkingLotId(parkingLotId);
        alert.setParkingLotName(parkingLotName);
        alert.setType(AlertType.SENSOR);
        alert.setSeverity(severity);
        alert.setState(StateAlert.OPEN);
        alert.setZone(zone);
        alert.setSensorId(sensorId);
        alert.setDescription(description);
        alert.setNotes(notes);
        alert.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return alertRepository.save(alert);
    }

    public List<AlertStateHistoryEntry> history(UUID alertId) {
        return alertStateHistoryRepository.findByAlertId(alertId);
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
        Map<UUID, String> technicianNameByParkId = resolveTechnicianNamesByParkId(parkIds, lotsById);

        for (Alert alert : alerts) {
            if (alert.getType() != AlertType.CLIENT) {
                continue;
            }

            String currentAssigned = alert.getAttributedTo();
            if (alert.getReportedBy() == null || alert.getReportedBy().isBlank()) {
                alert.setReportedBy(currentAssigned);
            }

            String technicianName = technicianNameByParkId.get(alert.getParkingLotId());
            if (technicianName != null && !technicianName.isBlank()) {
                alert.setAttributedTo(technicianName);
            }
        }
    }

    private Map<UUID, String> resolveTechnicianNamesByParkId(List<UUID> parkIds, Map<UUID, ParkingLot> lotsById) {
        Map<UUID, String> technicianNameByParkId = lotsById.values().stream()
            .filter(lot -> lot.getTechnician() != null && lot.getTechnician().getName() != null)
            .collect(Collectors.toMap(ParkingLot::getId, lot -> lot.getTechnician().getName(), (a, b) -> a));

        List<UUID> unresolvedParkIds = parkIds.stream()
            .filter(id -> !technicianNameByParkId.containsKey(id))
            .toList();
        if (unresolvedParkIds.isEmpty()) {
            return technicianNameByParkId;
        }

        List<UUID> technicianIds = unresolvedParkIds.stream()
            .flatMap(parkId -> technicianParkAssignmentRepository.findByParkingLotId(parkId).stream())
            .map(TechnicianParkAssignment::getTechnicianId)
            .distinct()
            .toList();

        Map<UUID, User> usersById = userRepository.findAllById(technicianIds).stream()
            .collect(Collectors.toMap(User::getId, u -> u));

        for (UUID parkId : unresolvedParkIds) {
            List<TechnicianParkAssignment> assignments = technicianParkAssignmentRepository.findByParkingLotId(parkId);
            for (TechnicianParkAssignment assignment : assignments) {
                User technician = usersById.get(assignment.getTechnicianId());
                if (technician != null && technician.getName() != null && !technician.getName().isBlank()) {
                    technicianNameByParkId.put(parkId, technician.getName());
                    break;
                }
            }
        }
        return technicianNameByParkId;
    }
}
