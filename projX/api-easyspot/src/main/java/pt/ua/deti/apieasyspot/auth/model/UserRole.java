package pt.ua.deti.apieasyspot.auth.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum UserRole {
    DRIVER, MANAGER, TECHNICIAN;

    @JsonValue
    public String value() {
        return name();
    }

    @JsonCreator
    public static UserRole fromValue(String raw) {
        if (raw == null || raw.isBlank()) {
            throw new IllegalArgumentException("role is required");
        }
        return Arrays.stream(values())
            .filter(r -> r.name().equalsIgnoreCase(raw))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException(
                "invalid role: " + raw + ". Must be one of: DRIVER, MANAGER, TECHNICIAN"));
    }
}
