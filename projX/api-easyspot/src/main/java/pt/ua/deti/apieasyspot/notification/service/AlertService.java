package pt.ua.deti.apieasyspot.notification.service;


import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.repository.AlertRepository;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AlertService {

    private final AlertRepository alertRepository;

    public void updateState(UUID id, String rawState){
        Alert alert = alertRepository.findById(id)
            .orElseThrow(()-> new ResourceNotFoundException("Alert not found: " + id));

        StateAlert newState = parseState(rawState);

        boolean becomingResolver = newState == StateAlert.RESOLVED && alert.getState() != StateAlert.RESOLVED;

        alert.setState(newState);

        if(becomingResolver){
            alert.setResolvedAt(LocalDateTime.now());
        }

        alertRepository.save(alert);

    }

    private StateAlert parseState(String rawState){
        try{
            return StateAlert.valueOf(rawState.toUpperCase());
        } catch (IllegalArgumentException e){
            throw new IllegalArgumentException("Invalid state: " + rawState);
        }
    }
}
