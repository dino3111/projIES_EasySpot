package pt.ua.deti.apieasyspot.booking.event;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.booking.model.Reservation;

import java.time.Instant;

@Slf4j
@Component
@RequiredArgsConstructor
public class ReservationEventPublisher {

    static final String TOPIC = "reservation-events";

    private final KafkaTemplate<String, String> kafkaTemplate;

    public void publishCreated(Reservation reservation) {
        String payload = buildPayload(
            "RESERVATION_CREATED",
            reservation.getParkingLot().getId().toString(),
            reservation.getVehicle() != null ? reservation.getVehicle().getId().toString() : null,
            "Reservation " + reservation.getBookingCode() + " confirmed"
        );
        send(reservation.getId().toString(), payload);
    }

    public void publishCancelled(Reservation reservation) {
        String payload = buildPayload(
            "RESERVATION_CANCELLED",
            reservation.getParkingLot().getId().toString(),
            reservation.getVehicle() != null ? reservation.getVehicle().getId().toString() : null,
            "Reservation " + reservation.getBookingCode() + " cancelled"
        );
        send(reservation.getId().toString(), payload);
    }

    private String buildPayload(String alertType, String parkId, String vehicleId, String message) {
        String vid = vehicleId != null ? "\"" + vehicleId + "\"" : "null";
        return """
            {"alertType":"%s","parkId":"%s","vehicleId":%s,"message":"%s","occurredAt":"%s","source":"reservation-service"}
            """.formatted(alertType, parkId, vid, message, Instant.now()).strip();
    }

    private void send(String key, String payload) {
        kafkaTemplate.send(TOPIC, key, payload)
            .whenComplete((result, ex) -> {
                if (ex != null) {
                    log.warn("Failed to publish reservation event: {}", ex.getMessage());
                }
            });
    }
}
