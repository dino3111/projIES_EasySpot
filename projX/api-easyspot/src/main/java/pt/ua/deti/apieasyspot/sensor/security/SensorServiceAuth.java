package pt.ua.deti.apieasyspot.sensor.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component("sensorServiceAuth")
public class SensorServiceAuth {

    private static final String HEADER_NAME = "X-Simulation-Token";

    @Value("${simulation.service-token:}")
    private String configuredToken;

    public boolean hasValidKey(HttpServletRequest request) {
        if (configuredToken == null || configuredToken.isBlank()) {
            return false;
        }
        String provided = request.getHeader(HEADER_NAME);
        return configuredToken.equals(provided);
    }
}
