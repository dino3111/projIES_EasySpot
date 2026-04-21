package pt.ua.deti.apieasyspot.occupancy.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.billing.repository.ParkingSessionRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ForbiddenException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.TariffResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.UpdateTariffRequest;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffAudit;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffAuditRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ManagerTariffServiceTest {

    @Mock private TariffRepository tariffRepository;
    @Mock private TariffAuditRepository tariffAuditRepository;
    @Mock private ParkingLotRepository parkingLotRepository;
    @Mock private ParkingSessionRepository parkingSessionRepository;

    @InjectMocks private ManagerTariffService managerTariffService;

    private ParkingLot lot;
    private UUID lotId;

    @BeforeEach
    void setUp() {
        lotId = UUID.randomUUID();
        lot = new ParkingLot();
        lot.setId(lotId);
        lot.setName("Test Park");
        lot.setCity("Test City");
    }

    @Test
    @DisplayName("List tariffs returns mapped responses")
    void listTariffs_ReturnsMappedResponses() {
        Tariff t = new Tariff();
        t.setId(UUID.randomUUID());
        t.setParkingLot(lot);
        t.setPricePerHour(BigDecimal.ONE);
        t.setStatus(TariffStatus.ACTIVE);

        when(tariffRepository.findFiltered(lotId, "Test City", TariffStatus.ACTIVE))
            .thenReturn(List.of(t));

        List<TariffResponse> responses = managerTariffService.listTariffs(lotId, "Test City", TariffStatus.ACTIVE);

        assertEquals(1, responses.size());
        assertEquals("Test Park", responses.get(0).parkName());
    }

    @Test
    @DisplayName("Update existing tariff succeeds and creates audit")
    void updateTariff_ExistingTariff_UpdatesAndAudits() {
        Tariff existing = new Tariff();
        existing.setId(UUID.randomUUID());
        existing.setParkingLot(lot);
        existing.setPricePerHour(BigDecimal.ONE);

        UpdateTariffRequest request = new UpdateTariffRequest(
            lotId, new BigDecimal("2.00"), BigDecimal.TEN, new BigDecimal("50.00"), new BigDecimal("0.20"), TariffStatus.ACTIVE
        );

        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.of(lot));
        when(tariffRepository.findByParkingLotId(lotId)).thenReturn(List.of(existing));
        when(parkingSessionRepository.countActiveSessionsByParkingLot(lotId)).thenReturn(0L);
        when(tariffRepository.save(any(Tariff.class))).thenAnswer(i -> i.getArguments()[0]);

        TariffResponse response = managerTariffService.updateTariff(request, "mgr-1");

        assertEquals(new BigDecimal("2.00"), response.pricePerHour());
        verify(tariffRepository).save(existing);
        verify(tariffAuditRepository).save(any(TariffAudit.class));
    }

    @Test
    @DisplayName("Create new tariff when none exists")
    void updateTariff_NewTariff_CreatesAndAudits() {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lotId, new BigDecimal("2.00"), BigDecimal.TEN, new BigDecimal("50.00"), new BigDecimal("0.20"), TariffStatus.ACTIVE
        );

        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.of(lot));
        when(tariffRepository.findByParkingLotId(lotId)).thenReturn(Collections.emptyList());
        when(parkingSessionRepository.countActiveSessionsByParkingLot(lotId)).thenReturn(0L);
        when(tariffRepository.save(any(Tariff.class))).thenAnswer(i -> i.getArguments()[0]);

        TariffResponse response = managerTariffService.updateTariff(request, "mgr-1");

        assertNotNull(response);
        verify(tariffRepository).save(argThat(t -> "Default Tariff".equals(t.getName())));
        verify(tariffAuditRepository).save(any(TariffAudit.class));
    }

    @Test
    @DisplayName("Throw exception when park not found")
    void updateTariff_ParkNotFound_ThrowsException() {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lotId, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.TEN, TariffStatus.ACTIVE
        );

        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> managerTariffService.updateTariff(request, "mgr-1"));
    }

    @Test
    @DisplayName("Throw exception when active sessions exist")
    void updateTariff_ActiveSessions_ThrowsConflict() {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lotId, new BigDecimal("2.00"), BigDecimal.TEN, new BigDecimal("50.00"), new BigDecimal("0.20"), TariffStatus.ACTIVE
        );

        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.of(lot));
        when(parkingSessionRepository.countActiveSessionsByParkingLot(lotId)).thenReturn(3L);

        assertThrows(ConflictException.class, () -> managerTariffService.updateTariff(request, "mgr-1"));
        verify(tariffRepository, never()).save(any());
    }

    @Test
    @DisplayName("Throw exception when manager ID is null")
    void updateTariff_NullManagerId_ThrowsForbidden() {
        UpdateTariffRequest request = new UpdateTariffRequest(
            lotId, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.TEN, TariffStatus.ACTIVE
        );

        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.of(lot));

        assertThrows(ForbiddenException.class, () -> managerTariffService.updateTariff(request, null));
    }

    @Test
    @DisplayName("Handle boundary price values - zero price")
    void updateTariff_ZeroPrice_Success() {
        Tariff existing = new Tariff();
        existing.setId(UUID.randomUUID());
        existing.setParkingLot(lot);

        UpdateTariffRequest request = new UpdateTariffRequest(
            lotId, new BigDecimal("0.00"), new BigDecimal("0.00"), new BigDecimal("0.00"), new BigDecimal("0.00"), TariffStatus.INACTIVE
        );

        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.of(lot));
        when(tariffRepository.findByParkingLotId(lotId)).thenReturn(List.of(existing));
        when(parkingSessionRepository.countActiveSessionsByParkingLot(lotId)).thenReturn(0L);
        when(tariffRepository.save(any(Tariff.class))).thenAnswer(i -> i.getArguments()[0]);

        TariffResponse response = managerTariffService.updateTariff(request, "mgr-1");

        assertEquals(new BigDecimal("0.00"), response.pricePerHour());
        assertEquals(TariffStatus.INACTIVE, response.status());
    }

    @Test
    @DisplayName("Handle large price values")
    void updateTariff_LargePrice_Success() {
        Tariff existing = new Tariff();
        existing.setId(UUID.randomUUID());
        existing.setParkingLot(lot);

        BigDecimal largePrice = new BigDecimal("99999.99");
        UpdateTariffRequest request = new UpdateTariffRequest(
            lotId, largePrice, largePrice, largePrice, largePrice, TariffStatus.ACTIVE
        );

        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.of(lot));
        when(tariffRepository.findByParkingLotId(lotId)).thenReturn(List.of(existing));
        when(parkingSessionRepository.countActiveSessionsByParkingLot(lotId)).thenReturn(0L);
        when(tariffRepository.save(any(Tariff.class))).thenAnswer(i -> i.getArguments()[0]);

        TariffResponse response = managerTariffService.updateTariff(request, "mgr-1");

        assertEquals(largePrice, response.pricePerHour());
    }

    @Test
    @DisplayName("Handle status transition from ACTIVE to INACTIVE")
    void updateTariff_StatusTransition_Success() {
        Tariff existing = new Tariff();
        existing.setId(UUID.randomUUID());
        existing.setParkingLot(lot);
        existing.setStatus(TariffStatus.ACTIVE);

        UpdateTariffRequest request = new UpdateTariffRequest(
            lotId, BigDecimal.ONE, BigDecimal.TEN, BigDecimal.TEN, BigDecimal.ONE, TariffStatus.INACTIVE
        );

        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.of(lot));
        when(tariffRepository.findByParkingLotId(lotId)).thenReturn(List.of(existing));
        when(parkingSessionRepository.countActiveSessionsByParkingLot(lotId)).thenReturn(0L);
        when(tariffRepository.save(any(Tariff.class))).thenAnswer(i -> i.getArguments()[0]);

        TariffResponse response = managerTariffService.updateTariff(request, "mgr-1");

        assertEquals(TariffStatus.INACTIVE, response.status());
    }
}
