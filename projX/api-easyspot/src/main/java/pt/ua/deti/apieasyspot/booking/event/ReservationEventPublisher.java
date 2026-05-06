package pt.ua.deti.apieasyspot.booking.event;

import com.fasterxml.jackson.core.JacksonException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.booking.model.Reservation;

import java.time.Instant;
import java.util.Map;

@Slf4j
@Component
public class ReservationEventPublisher {

    static final String TOPIC = "reservation-events";

    @Autowired(required = false)
    private KafkaTemplate<String, String> kafkaTemplate;

    private final ObjectMapper objectMapper;

    public ReservationEventPublisher(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void publishCreated(Reservation reservation) {
        send(reservation, "RESERVATION_CREATED",
            "Reservation " + reservation.getBookingCode() + " confirmed");
    }

    public void publishCancelled(Reservation reservation) {
        send(reservation, "RESERVATION_CANCELLED",
            "Reservation " + reservation.getBookingCode() + " cancelled");
    }

    private void send(Reservation reservation, String alertType, String message) {
        if (kafkaTemplate == null) {
            log.debug("Kafka not configured — skipping event {} for {}", alertType, reservation.getBookingCode());
            return;
        }

        String vehicleId = reservation.getVehicle() != null
            ? reservation.getVehicle().getId().toString()
            : null;

        Map<String, Object> payload = Map.of(
            "alertType", alertType,
            "parkId", reservation.getParkingLot().getId().toString(),
            "vehicleId", vehicleId != null ? vehicleId : "",
            "message", message,
            "occurredAt", Instant.now().toString(),
            "source", "reservation-service"
        );

        try {
            String json = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(TOPIC, reservation.getId().toString(), json)
                .whenComplete((result, ex) -> {
                    if (ex != null) {
                        log.warn("Failed to publish reservation event: {}", ex.getMessage());
                    }
                });
        } catch (JacksonException ex) {
            log.warn("Failed to serialize reservation event for {}: {}", reservation.getBookingCode(), ex.getMessage());
        }
    }
}
