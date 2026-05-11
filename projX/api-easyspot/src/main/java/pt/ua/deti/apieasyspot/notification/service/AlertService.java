package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final TimescaleAlertRepository alertRepository;

    public List<Alert> listAlerts(UUID parkId, StateAlert state, SeverityAlert severity) {
        return alertRepository.findAllFiltered(parkId, state, severity);
    }

    public List<Alert> listAlertsByParks(List<UUID> parkIds, StateAlert state, SeverityAlert severity) {
        return alertRepository.findAllFilteredByParks(parkIds, state, severity);
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
}
