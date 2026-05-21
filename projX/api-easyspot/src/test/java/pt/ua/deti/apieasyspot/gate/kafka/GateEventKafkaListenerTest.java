package pt.ua.deti.apieasyspot.gate.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import pt.ua.deti.apieasyspot.gate.repository.GateEventRepository;
import pt.ua.deti.apieasyspot.sensor.service.SensorLogsService;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class GateEventKafkaListenerTest {

    private GateEventRepository gateEventRepository;
    private SensorLogsService sensorLogsService;
    private GateEventKafkaListener listener;

    @BeforeEach
    void setUp() {
        gateEventRepository = mock(GateEventRepository.class);
        sensorLogsService = mock(SensorLogsService.class);
        listener = new GateEventKafkaListener(
            new ObjectMapper().findAndRegisterModules(),
            gateEventRepository,
            sensorLogsService
        );
    }

    @Test
    @DisplayName("gate.opened is persisted, no service calls")
    void gateOpened_persistedOnly() {
        String payload = gatePayload("gate.opened", "OPEN", "CLOSED", null, "valid_ocr_read");

        listener.onEvent(payload);

        verify(gateEventRepository).save(any());
        verifyNoInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("gate.closed is persisted, no service calls")
    void gateClosed_persistedOnly() {
        String payload = gatePayload("gate.closed", "CLOSED", "OPEN", null, "auto_close_timeout");

        listener.onEvent(payload);

        verify(gateEventRepository).save(any());
        verifyNoInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("gate.fault persists and calls faultSensor")
    void gateFault_persistsAndFaultsSensor() {
        String payload = gatePayload("gate.fault", "FAULT", "CLOSED", null, "hardware_fault");

        listener.onEvent(payload);

        verify(gateEventRepository).save(any());
        verify(sensorLogsService).faultSensor("gate-test-entry");
        verifyNoMoreInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("gate.recovered persists and calls recoverSensor with reason")
    void gateRecovered_persistsAndRecoversSensor() {
        String payload = gatePayload("gate.recovered", "CLOSED", "FAULT", null, "fault_recovered");

        listener.onEvent(payload);

        verify(gateEventRepository).save(any());
        verify(sensorLogsService).recoverSensor("gate-test-entry", "fault_recovered");
    }

    @Test
    @DisplayName("missing parkId is ignored without throwing")
    void missingParkId_ignoredSafely() {
        String payload = """
            {"eventId":"%s","eventType":"gate.opened","occurredAt":"%s","version":1,
             "payload":{"gateId":"gate-test","direction":"entry","state":"OPEN",
             "previousState":"CLOSED","reason":"test"}}
            """.formatted(UUID.randomUUID(), Instant.now()).strip();

        listener.onEvent(payload);

        verifyNoInteractions(gateEventRepository);
        verifyNoInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("missing gateId is ignored without throwing")
    void missingGateId_ignoredSafely() {
        String payload = """
            {"eventId":"%s","parkId":"%s","eventType":"gate.opened","occurredAt":"%s","version":1,
             "payload":{"direction":"entry","state":"OPEN","previousState":"CLOSED","reason":"test"}}
            """.formatted(UUID.randomUUID(), UUID.randomUUID(), Instant.now()).strip();

        listener.onEvent(payload);

        verifyNoInteractions(gateEventRepository);
        verifyNoInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("malformed JSON is ignored without throwing")
    void malformedJson_ignoredSafely() {
        listener.onEvent("{not valid json}");

        verifyNoInteractions(gateEventRepository);
        verifyNoInteractions(sensorLogsService);
    }

    @Test
    @DisplayName("duplicate gate.fault events are processed without backend failure")
    void duplicateGateFault_processedSafely() {
        String payload = gatePayload("gate.fault", "FAULT", "CLOSED", null, "hardware_fault");

        listener.onEvent(payload);
        listener.onEvent(payload);

        verify(gateEventRepository, times(2)).save(any());
        verify(sensorLogsService, times(2)).faultSensor("gate-test-entry");
    }

    @Test
    @DisplayName("gate fault followed by recovered triggers expected transition calls")
    void gateFaultThenRecovered_callsFaultThenRecover() {
        String faultPayload = gatePayload("gate.fault", "FAULT", "CLOSED", null, "hardware_fault");
        String recoveryPayload = gatePayload("gate.recovered", "CLOSED", "FAULT", null, "TECHNICIAN_REPAIR");

        listener.onEvent(faultPayload);
        listener.onEvent(recoveryPayload);

        verify(sensorLogsService).faultSensor("gate-test-entry");
        verify(sensorLogsService).recoverSensor("gate-test-entry", "TECHNICIAN_REPAIR");
    }

    private String gatePayload(String eventType, String state, String previousState, String plate, String reason) {
        return """
            {"eventId":"%s","parkId":"%s","eventType":"%s","occurredAt":"%s","version":1,
             "payload":{"gateId":"gate-test-entry","direction":"entry","state":"%s",
             "previousState":"%s","plate":%s,"reason":"%s"}}
            """.formatted(
            UUID.randomUUID(), UUID.randomUUID(),
            eventType, Instant.now(),
            state, previousState,
            plate != null ? "\"" + plate + "\"" : "null",
            reason
        ).strip();
    }
}
