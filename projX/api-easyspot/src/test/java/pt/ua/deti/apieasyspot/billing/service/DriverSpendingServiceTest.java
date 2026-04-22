package pt.ua.deti.apieasyspot.billing.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.dto.DriverSpendingResponse;
import pt.ua.deti.apieasyspot.billing.repository.DriverSpendingRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DriverSpendingServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private VehicleRepository vehicleRepository;
    @Mock private DriverSpendingRepository repository;
    @InjectMocks private DriverSpendingService service;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setAuthentikUserId("driver-sub-001");
        user.setRole("DRIVER");
        lenient().when(userRepository.findByAuthentikUserId("driver-sub-001")).thenReturn(Optional.of(user));
    }

    @Test
    @DisplayName("resolveRange - custom dates with invalid order - throws 400")
    void resolveRange_invalidOrder_throws() {
        assertThatThrownBy(() -> service.resolveRange(null, "2026-04-10", "2026-04-05"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("from must be before to");
    }

    @Test
    @DisplayName("resolveRange - mixed timeWindow and custom range - throws 400")
    void resolveRange_mixedFilters_throws() {
        assertThatThrownBy(() -> service.resolveRange("7D", "2026-04-01", "2026-04-05"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("either timeWindow or from/to");
    }

    @Test
    @DisplayName("getSpending - unknown vehicle for user - throws 404")
    void getSpending_unknownVehicle_throws404() {
        UUID vehicleId = UUID.randomUUID();
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSpending("driver-sub-001", vehicleId.toString(), "7D", null, null, 0, 50))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Unknown vehicleId");
    }

    @Test
    @DisplayName("getSpending - empty history - returns zeroed totals and empty arrays")
    void getSpending_emptyHistory_returnsZeroedResponse() {
        when(repository.totals(eq(user.getId()), any(), any(), any()))
            .thenReturn(new DriverSpendingRepository.TotalsRow(BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, 0));
        when(repository.costliestSession(eq(user.getId()), any(), any(), any())).thenReturn(null);
        when(repository.timeseries(eq(user.getId()), any(), any(), any())).thenReturn(List.of());
        when(repository.breakdownByPark(eq(user.getId()), any(), any(), any())).thenReturn(List.of());
        when(repository.breakdownByVehicle(eq(user.getId()), any(), any(), any())).thenReturn(List.of());
        when(repository.history(eq(user.getId()), any(), any(), any(), anyInt(), anyInt())).thenReturn(List.of());

        DriverSpendingResponse response = service.getSpending("driver-sub-001", null, "30D", null, null, 0, 50);

        assertThat(response.totals().totalSpent()).isEqualByComparingTo("0.00");
        assertThat(response.totals().avgPerSession()).isEqualByComparingTo("0.00");
        assertThat(response.insights().mostUsedPark()).isNull();
        assertThat(response.history()).isEmpty();
        assertThat(response.breakdownByVehicle()).isEmpty();
    }

    @Test
    @DisplayName("getSpending - computes averages and maps insights")
    void getSpending_mapsResponse() {
        UUID vehicleId = UUID.randomUUID();
        Vehicle vehicle = new Vehicle();
        vehicle.setId(vehicleId);
        when(vehicleRepository.findByIdAndUserId(vehicleId, user.getId())).thenReturn(Optional.of(vehicle));

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        when(repository.totals(eq(user.getId()), eq(vehicleId), any(), any()))
            .thenReturn(new DriverSpendingRepository.TotalsRow(
                new BigDecimal("30.00"), new BigDecimal("12.00"), new BigDecimal("18.00"), 3));
        when(repository.costliestSession(eq(user.getId()), eq(vehicleId), any(), any()))
            .thenReturn(new DriverSpendingRepository.CostliestSessionRow("Fórum Aveiro", now, "AA-00-AA", new BigDecimal("20.00")));
        when(repository.timeseries(eq(user.getId()), eq(vehicleId), any(), any())).thenReturn(List.of());
        when(repository.breakdownByPark(eq(user.getId()), eq(vehicleId), any(), any()))
            .thenReturn(List.of(new DriverSpendingRepository.ParkBreakdownRow(
                UUID.randomUUID(), "Fórum Aveiro", new BigDecimal("14.00"), 2)));
        when(repository.breakdownByVehicle(eq(user.getId()), eq(vehicleId), any(), any())).thenReturn(List.of());
        when(repository.history(eq(user.getId()), eq(vehicleId), any(), any(), anyInt(), anyInt())).thenReturn(List.of());

        DriverSpendingResponse response = service.getSpending("driver-sub-001", vehicleId.toString(), null, null, null, 0, 50);

        assertThat(response.totals().totalSpent()).isEqualByComparingTo("30.00");
        assertThat(response.totals().avgPerSession()).isEqualByComparingTo("10.00");
        assertThat(response.totals().parkingSpent()).isEqualByComparingTo("18.00");
        assertThat(response.insights().mostUsedPark()).isEqualTo("Fórum Aveiro");
        assertThat(response.insights().costliestSession().totalSpent()).isEqualByComparingTo("20.00");
    }
}
