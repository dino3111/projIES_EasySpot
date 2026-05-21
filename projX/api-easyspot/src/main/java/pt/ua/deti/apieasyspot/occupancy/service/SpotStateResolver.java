package pt.ua.deti.apieasyspot.occupancy.service;

import org.springframework.stereotype.Component;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

@Component
public class SpotStateResolver {

    private static final String STATUS_FREE = "free";
    private static final String STATUS_OCCUPIED = "occupied";
    private static final String STATUS_RESERVED = "reserved";
    private static final String STATUS_OUT_OF_SERVICE = "out_of_service";

    private static final Set<String> ALLOWED = Set.of(
        STATUS_FREE, STATUS_OCCUPIED, STATUS_RESERVED, STATUS_OUT_OF_SERVICE
    );

    public Resolution resolve(String currentStatus, String incomingStatus, Map<String, Object> payload) {
        String current = normalize(currentStatus);
        String incoming = normalize(incomingStatus);

        if (!ALLOWED.contains(incoming)) {
            return Resolution.reject("INVALID_STATUS");
        }

        // Hard safety rule: out_of_service is sticky until an explicit recovery reason arrives.
        if (STATUS_OUT_OF_SERVICE.equals(current) && !STATUS_OUT_OF_SERVICE.equals(incoming)) {
            String reason = readString(payload, "reason");
            if (!"AUTO_RECOVERY".equals(reason) && !"TECHNICIAN_REPAIR".equals(reason)) {
                return Resolution.reject("REQUIRES_EXPLICIT_RECOVERY");
            }
        }

        // Safety first: fault always wins over operational statuses.
        if (STATUS_OUT_OF_SERVICE.equals(incoming)) {
            return Resolution.accept(STATUS_OUT_OF_SERVICE, "FAULT_PRIORITY");
        }

        String source = readString(payload, "source");
        boolean hasActiveReservation = Boolean.TRUE.equals(payload != null ? payload.get("hasActiveReservation") : null);

        // Reservation/business signal has priority over sensor/OCR free.
        if (hasActiveReservation && STATUS_FREE.equals(incoming)) {
            return Resolution.accept(STATUS_RESERVED, "RESERVATION_PRIORITY");
        }

        // Conflict between sensor and OCR: sensor wins for occupancy/free transitions.
        if ("OCR".equalsIgnoreCase(source)
            && STATUS_OCCUPIED.equals(current)
            && STATUS_FREE.equals(incoming)) {
            return Resolution.reject("OCR_CONFLICT_WITH_SENSOR_OCCUPIED");
        }

        if (!isPlausibleTransition(current, incoming)) {
            return Resolution.reject("IMPLAUSIBLE_TRANSITION");
        }

        return Resolution.accept(incoming, "DIRECT");
    }

    public String normalize(String status) {
        if (status == null) return STATUS_FREE;
        String normalized = status.trim().toLowerCase(Locale.ROOT);
        if ("ev".equals(normalized) || "accessible".equals(normalized)) {
            return STATUS_FREE;
        }
        return normalized;
    }

    private boolean isPlausibleTransition(String from, String to) {
        if (from.equals(to)) return true;
        if (STATUS_FREE.equals(from)) return STATUS_OCCUPIED.equals(to) || STATUS_RESERVED.equals(to) || STATUS_OUT_OF_SERVICE.equals(to);
        if (STATUS_OCCUPIED.equals(from)) return STATUS_FREE.equals(to) || STATUS_OUT_OF_SERVICE.equals(to);
        if (STATUS_RESERVED.equals(from)) return STATUS_OCCUPIED.equals(to) || STATUS_FREE.equals(to) || STATUS_OUT_OF_SERVICE.equals(to);
        if (STATUS_OUT_OF_SERVICE.equals(from)) return STATUS_FREE.equals(to) || STATUS_OUT_OF_SERVICE.equals(to);
        return STATUS_FREE.equals(to);
    }

    private String readString(Map<String, Object> payload, String key) {
        if (payload == null) return null;
        Object value = payload.get(key);
        return value instanceof String s ? s : null;
    }

    public record Resolution(boolean accepted, String finalStatus, String reasonCode) {
        public static Resolution accept(String finalStatus, String reasonCode) {
            return new Resolution(true, finalStatus, reasonCode);
        }

        public static Resolution reject(String reasonCode) {
            return new Resolution(false, null, reasonCode);
        }
    }
}
