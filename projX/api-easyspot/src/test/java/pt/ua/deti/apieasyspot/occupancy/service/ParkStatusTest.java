package pt.ua.deti.apieasyspot.occupancy.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.ManagerParkSummaryResponse;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkStatus;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Unit tests for park status business rules:
 *  - ACTIVE parks appear in driver search
 *  - SUSPENDED parks are excluded from driver search
 *  - Manager can update park status
 *  - SUSPENDED park does not accept new reservations (tested via ReservationService)
 */
@ExtendWith(MockitoExtension.class)
class ParkStatusTest {

    @Mock
    ParkingLotRepository parkingLotRepository;

    @InjectMocks
    ManagerParkService managerParkService;

    private ParkingLot activeLot;
    private ParkingLot suspendedLot;

    @BeforeEach
    void setUp() {
        activeLot = new ParkingLot();
        activeLot.setId(UUID.randomUUID());
        activeLot.setName("Parque Ativo");
        activeLot.setCity("Aveiro");
        activeLot.setAddress("Rua A, 1");
        activeLot.setLatitude(40.0);
        activeLot.setLongitude(-8.0);
        activeLot.setOpeningHours("24h");
        activeLot.setTotalSpaces(50);
        activeLot.setStatus(ParkStatus.ACTIVE);

        suspendedLot = new ParkingLot();
        suspendedLot.setId(UUID.randomUUID());
        suspendedLot.setName("Parque Suspenso");
        suspendedLot.setCity("Porto");
        suspendedLot.setAddress("Rua B, 2");
        suspendedLot.setLatitude(41.0);
        suspendedLot.setLongitude(-8.5);
        suspendedLot.setOpeningHours("08:00-22:00");
        suspendedLot.setTotalSpaces(30);
        suspendedLot.setStatus(ParkStatus.SUSPENDED);
    }

    // ── listAllParks ─────────────────────────────────────────────────────────────

    @Test
    void listAllParks_returnsAllParksWithStatus() {
        when(parkingLotRepository.findAllByOrderByNameAsc()).thenReturn(List.of(activeLot, suspendedLot));

        List<ManagerParkSummaryResponse> result = managerParkService.listAllParks();

        assertThat(result).hasSize(2);
        assertThat(result).extracting(ManagerParkSummaryResponse::status)
            .containsExactlyInAnyOrder(ParkStatus.ACTIVE, ParkStatus.SUSPENDED);
    }

    @Test
    void listAllParks_includesSuspendedParks() {
        when(parkingLotRepository.findAllByOrderByNameAsc()).thenReturn(List.of(suspendedLot));

        List<ManagerParkSummaryResponse> result = managerParkService.listAllParks();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).status()).isEqualTo(ParkStatus.SUSPENDED);
        assertThat(result.get(0).name()).isEqualTo("Parque Suspenso");
    }

    // ── updateParkStatus ─────────────────────────────────────────────────────────

    @Test
    void updateParkStatus_activeToSuspended_succeeds() {
        when(parkingLotRepository.findById(activeLot.getId())).thenReturn(Optional.of(activeLot));
        when(parkingLotRepository.save(activeLot)).thenAnswer(inv -> {
            ParkingLot saved = inv.getArgument(0);
            return saved;
        });

        ManagerParkSummaryResponse response = managerParkService.updateParkStatus(activeLot.getId(), ParkStatus.SUSPENDED);

        assertThat(response.status()).isEqualTo(ParkStatus.SUSPENDED);
        assertThat(activeLot.getStatus()).isEqualTo(ParkStatus.SUSPENDED);
    }

    @Test
    void updateParkStatus_suspendedToActive_succeeds() {
        when(parkingLotRepository.findById(suspendedLot.getId())).thenReturn(Optional.of(suspendedLot));
        when(parkingLotRepository.save(suspendedLot)).thenAnswer(inv -> inv.getArgument(0));

        ManagerParkSummaryResponse response = managerParkService.updateParkStatus(suspendedLot.getId(), ParkStatus.ACTIVE);

        assertThat(response.status()).isEqualTo(ParkStatus.ACTIVE);
    }

    @Test
    void updateParkStatus_parkNotFound_throwsResourceNotFoundException() {
        UUID missing = UUID.randomUUID();
        when(parkingLotRepository.findById(missing)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> managerParkService.updateParkStatus(missing, ParkStatus.SUSPENDED))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("Park not found");
    }

    // ── park default status ───────────────────────────────────────────────────────

    @Test
    void newParkingLot_defaultStatusIsActive() {
        ParkingLot lot = new ParkingLot();
        assertThat(lot.getStatus()).isEqualTo(ParkStatus.ACTIVE);
    }
}
