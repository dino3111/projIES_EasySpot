package pt.ua.deti.apieasyspot.sensor.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.Mockito.*;

class SensorEventKafkaListenerTest {

    private SensorLogsService sensorLogsService;
    private SensorEventKafkaListener listener;

    @BeforeEach
    void setUp() {
        sensorLogsService = mock(SensorLogsService.class);
        listener = new SensorEventKafkaListener(new ObjectMapper().findAndRegisterModules(), sensorLogsService);
    }

    @Test
    @DisplayName("sensor.fault calls faultSensor")
    void faultEvent_callsFaultSensor() {
        String payload = """
            {"eventId":"%s","eventType":"sensor.fault","parkId":"%s","sensorId":"IR-aabb","occurredAt":"%s","version":1}
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), Instant.now()).strip();

        listener.onEvent(payload);

        verify(sensorLogsService).faultSensor("IR-aabb");
        verifyNoMoreInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("device.fault also calls faultSensor")
    void deviceFaultAlias_callsFaultSensor() {
        String payload = """
            {"eventId":"%s","eventType":"device.fault","parkId":"%s","sensorId":"IR-ccdd","version":1}
            """.formatted(UUID.randomUUID(), UUID.randomUUID()).strip();

        listener.onEvent(payload);

        verify(sensorLogsService).faultSensor("IR-ccdd");
    }

    @Test
    @DisplayName("sensor.recovered calls recoverSensor with payload recoveryType")
    void recoveryEvent_callsRecoverSensor() {
        String payload = """
            {"eventId":"%s","eventType":"sensor.recovered","parkId":"%s","sensorId":"IR-eeff",
             "payload":{"recoveryType":"TECHNICIAN_REPAIR"},"version":1}
            """.formatted(UUID.randomUUID(), UUID.randomUUID()).strip();

        listener.onEvent(payload);

        verify(sensorLogsService).recoverSensor("IR-eeff", "TECHNICIAN_REPAIR");
    }

    @Test
    @DisplayName("sensor.recovered defaults to AUTO_RECOVERY when recoveryType absent")
    void recoveryEvent_defaultsToAutoRecovery() {
        String payload = """
            {"eventId":"%s","eventType":"device.recovery","parkId":"%s","sensorId":"IR-0011","version":1}
            """.formatted(UUID.randomUUID(), UUID.randomUUID()).strip();

        listener.onEvent(payload);

        verify(sensorLogsService).recoverSensor("IR-0011", "AUTO_RECOVERY");
    }

    @Test
    @DisplayName("unknown eventType does nothing beyond logging")
    void unknownEventType_noServiceCalls() {
        String payload = """
            {"eventId":"%s","eventType":"sensor.heartbeat","parkId":"%s","sensorId":"IR-2233","version":1}
            """.formatted(UUID.randomUUID(), UUID.randomUUID()).strip();

        listener.onEvent(payload);

        verifyNoInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("missing sensorId is ignored without throwing")
    void missingSensorId_ignoredSafely() {
        String payload = """
            {"eventId":"%s","eventType":"sensor.fault","parkId":"%s","version":1}
            """.formatted(UUID.randomUUID(), UUID.randomUUID()).strip();

        listener.onEvent(payload);

        verifyNoInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("malformed JSON is ignored without throwing")
    void malformedJson_ignoredSafely() {
        listener.onEvent("{not valid json}");
        verifyNoInteractions(sensorLogsService);
    }
}
