package pt.ua.deti.apieasyspot.occupancy.service;

import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class SpotStateResolverTest {

    private final SpotStateResolver resolver = new SpotStateResolver();

    @Test
    void outOfServiceRequiresExplicitRecoveryReason() {
        SpotStateResolver.Resolution resolution = resolver.resolve(
            "out_of_service",
            "free",
            Map.of("reason", "recovered")
        );
        assertThat(resolution.accepted()).isFalse();
        assertThat(resolution.reasonCode()).isEqualTo("REQUIRES_EXPLICIT_RECOVERY");
    }

    @Test
    void reservationPriorityOverridesIncomingFree() {
        SpotStateResolver.Resolution resolution = resolver.resolve(
            "reserved",
            "free",
            Map.of("hasActiveReservation", true)
        );
        assertThat(resolution.accepted()).isTrue();
        assertThat(resolution.finalStatus()).isEqualTo("reserved");
    }

    @Test
    void ocrCannotFreeSpotIfSensorStateIsOccupied() {
        SpotStateResolver.Resolution resolution = resolver.resolve(
            "occupied",
            "free",
            Map.of("source", "OCR")
        );
        assertThat(resolution.accepted()).isFalse();
        assertThat(resolution.reasonCode()).isEqualTo("OCR_CONFLICT_WITH_SENSOR_OCCUPIED");
    }
}
