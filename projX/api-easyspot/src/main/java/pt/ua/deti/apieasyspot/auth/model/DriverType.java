package pt.ua.deti.apieasyspot.auth.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

import java.util.Arrays;

public enum DriverType {
    REGULAR("regular"),
    EV("ev"),
    REDUCED_MOBILITY("reduced_mobility");

    private final String value;

    DriverType(String value) {
        this.value = value;
    }

    @JsonValue
    public String value() {
        return value;
    }

    @JsonCreator
    public static DriverType fromValue(String raw) {
        if (raw == null) {
            throw new IllegalArgumentException("driver type is required");
        }
        return Arrays.stream(values())
            .filter(type -> type.value.equalsIgnoreCase(raw))
            .findFirst()
            .orElseThrow(() -> new IllegalArgumentException("invalid driver type: " + raw));
    }
}
