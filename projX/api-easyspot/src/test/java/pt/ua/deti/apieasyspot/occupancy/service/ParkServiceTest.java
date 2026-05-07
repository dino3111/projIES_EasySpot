package pt.ua.deti.apieasyspot.occupancy.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotDetailsResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.ParkingLotSummaryResponse;
import pt.ua.deti.apieasyspot.occupancy.model.*;
import pt.ua.deti.apieasyspot.occupancy.repository.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ParkServiceTest {

    @Mock private ParkingLotRepository parkingLotRepository;
    @Mock private TariffRepository tariffRepository;
    @Mock private EVChargerRepository evChargerRepository;
    @Mock private AccessibleSpotRepository accessibleSpotRepository;
    @Mock private ParkingSpotRepository parkingSpotRepository;
    @Mock private JdbcTemplate jdbc;

    @InjectMocks private ParkService parkService;

    private UUID lotId;
    private ParkingLot lot;

    @BeforeEach
    void setUp() {
        lotId = UUID.randomUUID();
        lot = new ParkingLot();
        lot.setId(lotId);
        lot.setName("Test Park");
        lot.setAddress("Test Address");
        lot.setLatitude(1.0);
        lot.setLongitude(2.0);
        lot.setOpeningHours("24h");
        lot.setTotalSpaces(100);
        lot.setAmenities(List.of("Wifi"));
    }

    @Test
    void searchParks_returnsItemsFromJdbc() {
        ParkingLotSummaryResponse.ParkingLotSummary summary = new ParkingLotSummaryResponse.ParkingLotSummary(
            lotId, "Test Park", "Aveiro", "Test Address", 40.6405, -8.6538, "24h",
            BigDecimal.valueOf(1.5), 100, 20,
            new ParkingLotSummaryResponse.CountInfo(5, 10),
            new ParkingLotSummaryResponse.CountInfo(2, 5),
            "AVAILABLE"
        );
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of(summary));

        ParkingLotSummaryResponse response = parkService.searchParks("Test", 10, null, List.of("EV"), 1, 10);

        assertThat(response.items()).hasSize(1);
        assertThat(response.items().get(0).name()).isEqualTo("Test Park");
        assertThat(response.items().get(0).currentAvailabilityStatus()).isEqualTo("AVAILABLE");
        assertThat(response.pagination().page()).isEqualTo(1);
        assertThat(response.pagination().pageSize()).isEqualTo(10);
    }

    @Test
    void searchParks_noFilters_callsJdbc() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of());

        ParkingLotSummaryResponse response = parkService.searchParks(null, null, null, null, 1, 20);

        assertThat(response.items()).isEmpty();
        assertThat(response.pagination().totalItems()).isZero();
        assertThat(response.pagination().totalPages()).isZero();
    }

    @Test
    void searchParks_page2_usesCorrectOffset() {
        when(jdbc.query(anyString(), any(RowMapper.class), any(Object[].class))).thenReturn(List.of());

        ParkingLotSummaryResponse response = parkService.searchParks(null, null, null, null, 2, 10);

        assertThat(response.pagination().page()).isEqualTo(2);
        assertThat(response.pagination().pageSize()).isEqualTo(10);
    }

    @Test
    void getDetails_Success() {
        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.of(lot));

        when(jdbc.query(anyString(), any(RowMapper.class), eq(lotId))).thenReturn(List.of(
            new ParkingLotDetailsResponse.ZoneResponse("STANDARD", 80, 20, 75)
        ));

        Tariff tariff = new Tariff();
        tariff.setName("Standard");
        tariff.setPricePerHour(BigDecimal.valueOf(1.0));
        when(tariffRepository.findByParkingLotId(lotId)).thenReturn(List.of(tariff));

        EVCharger charger = new EVCharger();
        charger.setType("Type 2");
        charger.setAvailable(true);
        when(evChargerRepository.findByParkingLotId(lotId)).thenReturn(List.of(charger));

        AccessibleSpot acc = new AccessibleSpot();
        acc.setLocation("Piso 0");
        acc.setAvailable(true);
        acc.setDistanceToEntranceMeters(10);
        when(accessibleSpotRepository.findByParkingLotId(lotId)).thenReturn(List.of(acc));

        ParkingSpot spot = new ParkingSpot();
        spot.setSpotNumber("A1");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(1);
        spot.setSpotCol(1);
        spot.setStatus("free");
        when(parkingSpotRepository.findByParkingLotId(lotId)).thenReturn(List.of(spot));

        ParkingLotDetailsResponse response = parkService.getDetails(lotId);

        assertThat(response.id()).isEqualTo(lotId);
        assertThat(response.name()).isEqualTo("Test Park");
        assertThat(response.freeSpaces()).isEqualTo(20);
        assertThat(response.zones()).hasSize(1);
        assertThat(response.tariffs()).hasSize(1);
        assertThat(response.evChargers()).hasSize(1);
        assertThat(response.accessibility()).hasSize(1);
        assertThat(response.spotMap()).hasSize(1);
    }

    @Test
    void getDetails_NotFound() {
        when(parkingLotRepository.findById(lotId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> parkService.getDetails(lotId))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
