package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.notification.dto.TechnicianRealtimeEvent;
import pt.ua.deti.apieasyspot.notification.model.Alert;

import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TechnicianRealtimeNotifier {

    private final SimpMessagingTemplate messagingTemplate;
    private final UserRepository userRepository;
    private final pt.ua.deti.apieasyspot.analytics.repository.TechnicianParkAssignmentRepository analyticsAssignmentRepository;
    private final pt.ua.deti.apieasyspot.occupancy.repository.TechnicianParkAssignmentRepository occupancyAssignmentRepository;

    @Transactional(readOnly = true)
    public void sensorStatusChanged(UUID parkId, String sensorId, String status) {
        publish(new TechnicianRealtimeEvent(
            "SENSOR_STATUS_CHANGED",
            parkId,
            sensorId,
            status,
            null,
            null,
            Instant.now()
        ));
    }

    @Transactional(readOnly = true)
    public void alertChanged(String type, Alert alert) {
        if (alert == null) return;
        publish(new TechnicianRealtimeEvent(
            type,
            alert.getParkingLotId(),
            alert.getSensorId(),
            null,
            alert.getId(),
            alert.getState() != null ? alert.getState().name() : null,
            Instant.now()
        ));
    }

    private void publish(TechnicianRealtimeEvent event) {
        if (event.parkId() == null) {
            return;
        }

        List<UUID> technicianIds = technicianIdsForPark(event.parkId());
        if (technicianIds.isEmpty()) {
            log.debug("[TECH-WS] no technicians assigned for park={} event={}", event.parkId(), event.type());
            return;
        }

        userRepository.findAllById(technicianIds).forEach(user -> destinations(user).forEach(destination -> {
            messagingTemplate.convertAndSend(destination, event);
            log.debug("[TECH-WS] sent event={} destination={}", event.type(), destination);
        }));
    }

    private List<UUID> technicianIdsForPark(UUID parkId) {
        LinkedHashSet<UUID> ids = new LinkedHashSet<>();
        analyticsAssignmentRepository.findByParkingLotId(parkId).stream()
            .map(pt.ua.deti.apieasyspot.analytics.model.TechnicianParkAssignment::getTechnicianId)
            .forEach(ids::add);
        occupancyAssignmentRepository.findByParkingLotId(parkId).stream()
            .map(pt.ua.deti.apieasyspot.occupancy.model.TechnicianParkAssignment::getTechnicianId)
            .forEach(ids::add);
        return List.copyOf(ids);
    }

    private List<String> destinations(User user) {
        LinkedHashSet<String> destinations = new LinkedHashSet<>();
        if (hasText(user.getAuthentikUserId())) {
            destinations.add("/topic/technician/dashboard/" + user.getAuthentikUserId());
        }
        if (hasText(user.getAuthentikPk())) {
            destinations.add("/topic/technician/dashboard/" + user.getAuthentikPk());
        }
        return destinations.stream().filter(Objects::nonNull).toList();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
