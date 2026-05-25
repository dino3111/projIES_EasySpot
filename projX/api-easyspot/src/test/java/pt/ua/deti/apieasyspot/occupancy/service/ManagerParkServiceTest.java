package pt.ua.deti.apieasyspot.occupancy.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.analytics.service.TechnicianParkAssignmentService;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.auth.service.AuthentikClient;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.occupancy.dto.CreateParkRequest;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;
import pt.ua.deti.apieasyspot.occupancy.repository.*;
import pt.ua.deti.apieasyspot.sensor.repository.SensorRegistryRepository;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ManagerParkServiceTest {

    @Mock private UserRepository userRepository;
    @Mock private ParkingLotRepository parkingLotRepository;
    @Mock private ParkingSpotRepository parkingSpotRepository;
    @Mock private EVChargerRepository evChargerRepository;
    @Mock private AccessibleSpotRepository accessibleSpotRepository;
    @Mock private TechnicianParkAssignmentRepository assignmentRepository;
    @Mock private SensorRegistryRepository sensorRegistryRepository;
    @Mock private TechnicianParkAssignmentService analyticsAssignmentService;
    @Mock private AuthentikClient authentikClient;
    @Mock private TariffRepository tariffRepository;

    private ManagerParkService service;

    @BeforeEach
    void setUp() {
        service = new ManagerParkService(
            userRepository, parkingLotRepository, parkingSpotRepository,
            evChargerRepository, accessibleSpotRepository, assignmentRepository,
            sensorRegistryRepository, analyticsAssignmentService, authentikClient,
            tariffRepository
        );
    }

    private ParkingLot savedLot(CreateParkRequest req) {
        ParkingLot lot = new ParkingLot();
        lot.setId(UUID.randomUUID());
        lot.setName(req.name());
        lot.setCity(req.city());
        lot.setDistrict(req.district());
        lot.setAddress(req.address());
        lot.setLatitude(req.latitude());
        lot.setLongitude(req.longitude());
        lot.setTotalSpaces(req.totalSpaces());
        return lot;
    }

    private CreateParkRequest validRequest() {
        return new CreateParkRequest(
            "Parque Central", "Aveiro", "Aveiro",
            "Rua de Aveiro, 1", 40.64, -8.65,
            "08:00-22:00", 100, null
        );
    }

    @Test
    @DisplayName("createPark persists district from request")
    void createPark_persistsDistrict() {
        CreateParkRequest req = validRequest();
        ArgumentCaptor<ParkingLot> captor = ArgumentCaptor.forClass(ParkingLot.class);
        when(parkingLotRepository.save(captor.capture())).thenReturn(savedLot(req));

        ParkingLot result = service.createPark(req);

        assertThat(captor.getValue().getDistrict()).isEqualTo("Aveiro");
        assertThat(result.getDistrict()).isEqualTo("Aveiro");
    }

    @Test
    @DisplayName("createPark persists Porto district correctly")
    void createPark_differentDistrict_storedCorrectly() {
        CreateParkRequest req = new CreateParkRequest(
            "Parque Porto", "Porto", "Porto",
            "Rua do Porto, 10", 41.15, -8.61,
            "24h", 50, null
        );
        ArgumentCaptor<ParkingLot> captor = ArgumentCaptor.forClass(ParkingLot.class);
        when(parkingLotRepository.save(captor.capture())).thenReturn(savedLot(req));

        service.createPark(req);

        assertThat(captor.getValue().getDistrict()).isEqualTo("Porto");
    }

    @Test
    @DisplayName("createPark creates a default ACTIVE tariff so the park appears in tariff listings")
    void createPark_createsDefaultTariff() {
        CreateParkRequest req = validRequest();
        ParkingLot lot = savedLot(req);
        when(parkingLotRepository.save(any())).thenReturn(lot);
        ArgumentCaptor<Tariff> tariffCaptor = ArgumentCaptor.forClass(Tariff.class);

        service.createPark(req);

        verify(tariffRepository).save(tariffCaptor.capture());
        Tariff tariff = tariffCaptor.getValue();
        assertThat(tariff.getParkingLot()).isEqualTo(lot);
        assertThat(tariff.getStatus()).isEqualTo(TariffStatus.ACTIVE);
    }

    @Test
    @DisplayName("createPark with unknown technician throws before any save")
    void createPark_withUnknownTechnician_throwsResourceNotFound() {
        UUID techId = UUID.randomUUID();
        CreateParkRequest req = new CreateParkRequest(
            "Parque Central", "Aveiro", "Aveiro",
            "Rua de Aveiro, 1", 40.64, -8.65,
            "08:00-22:00", 100, techId
        );
        when(userRepository.findById(techId)).thenReturn(java.util.Optional.empty());

        assertThatThrownBy(() -> service.createPark(req))
            .isInstanceOf(ResourceNotFoundException.class);

        verify(parkingLotRepository, never()).save(any());
        verify(tariffRepository, never()).save(any());
    }
}
