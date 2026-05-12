package pt.ua.deti.apieasyspot.notification.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.mock.web.MockMultipartFile;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;
import pt.ua.deti.apieasyspot.notification.dto.CreateReportRequest;
import pt.ua.deti.apieasyspot.notification.dto.ReportResponse;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.argThat;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock private TimescaleAlertRepository alertRepository;
    @Mock private UserRepository userRepository;
    @Mock private ParkingLotRepository parkingLotRepository;
    @Mock private R2StorageService r2StorageService;
    @Mock private SimpMessagingTemplate messagingTemplate;

    @InjectMocks private ReportService reportService;

    private User driver;
    private User technician;
    private ParkingLot parkingLot;

    @BeforeEach
    void setUp() {
        driver = new User();
        driver.setId(UUID.randomUUID());
        driver.setAuthentikUserId("driver-sub-001");
        driver.setName("Filipe Teixeira");
        driver.setRole("DRIVER");

        technician = new User();
        technician.setId(UUID.randomUUID());
        technician.setAuthentikUserId("tech-sub-001");
        technician.setName("Laura Farias");
        technician.setRole("TECHNICAL");

        parkingLot = new ParkingLot();
        parkingLot.setId(UUID.randomUUID());
        parkingLot.setName("Parque Central");
        parkingLot.setCity("Aveiro");
        parkingLot.setTechnician(technician);

        lenient().when(userRepository.findByAuthentikUserId("driver-sub-001")).thenReturn(Optional.of(driver));
        lenient().when(parkingLotRepository.findById(parkingLot.getId())).thenReturn(Optional.of(parkingLot));
        lenient().when(alertRepository.save(any())).thenAnswer(inv -> {
            Alert a = inv.getArgument(0);
            a.setId(UUID.randomUUID());
            return a;
        });
    }

    @Test
    @DisplayName("create - valid infraction without photo - persists CLIENT/WARNING/OPEN alert and broadcasts")
    void create_noPhoto_persistsCorrectAlert() {
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A12", "accessible", "AA-12-BB", "Veículo sem dístico"
        );

        ReportResponse response = reportService.create("driver-sub-001", req, null);

        assertThat(response.type()).isEqualTo("CLIENT");
        assertThat(response.severity()).isEqualTo("WARNING");
        assertThat(response.state()).isEqualTo("OPEN");
        assertThat(response.zone()).isEqualTo("A");
        assertThat(response.spotNumber()).isEqualTo("A12");
        assertThat(response.plate()).isEqualTo("AA-12-BB");
        assertThat(response.photoUrl()).isNull();
        assertThat(response.createdAt()).isNotNull();
        verify(alertRepository).save(any(Alert.class));
        verify(messagingTemplate).convertAndSend(eq("/topic/reports"), any(ReportResponse.class));
        verifyNoInteractions(r2StorageService);
    }

    @Test
    @DisplayName("create - blocking violation - severity maps to CRITICAL")
    void create_blockingViolation_severityIsCritical() {
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "B", "B03", "blocking", null, "Bloqueia saída de emergência"
        );

        ReportResponse response = reportService.create("driver-sub-001", req, null);

        assertThat(response.severity()).isEqualTo("CRITICAL");
    }

    @ParameterizedTest
    @ValueSource(strings = {"accessible", "reserved", "ev", "double-parked", "other"})
    @DisplayName("create - non-blocking violations - severity maps to WARNING")
    void create_nonBlockingViolations_severityIsWarning(String violationType) {
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A01", violationType, null, "desc"
        );

        ReportResponse response = reportService.create("driver-sub-001", req, null);

        assertThat(response.severity()).isEqualTo("WARNING");
    }

    @Test
    @DisplayName("create - with valid JPEG photo - uploads to R2 and includes url in response")
    void create_withJpegPhoto_uploadsAndIncludesUrl() {
        when(r2StorageService.upload(any(), any(), any()))
            .thenReturn("https://cdn.example.com/reports/spot.jpg");
        MockMultipartFile photo = new MockMultipartFile("photo", "spot.jpg", "image/jpeg", new byte[1024]);
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "C", "C05", "ev", "BB-34-CC", "Veículo não elétrico"
        );

        ReportResponse response = reportService.create("driver-sub-001", req, photo);

        assertThat(response.photoUrl()).isEqualTo("https://cdn.example.com/reports/spot.jpg");
        verify(r2StorageService).upload(any(), any(), eq("image/jpeg"));
    }

    @Test
    @DisplayName("create - null photo - skips upload entirely")
    void create_nullPhoto_skipsUpload() {
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A01", "other", null, "desc"
        );

        reportService.create("driver-sub-001", req, null);

        verifyNoInteractions(r2StorageService);
    }

    @Test
    @DisplayName("create - empty multipart file - skips upload")
    void create_emptyFile_skipsUpload() {
        MockMultipartFile empty = new MockMultipartFile("photo", new byte[0]);
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A01", "other", null, "desc"
        );

        ReportResponse response = reportService.create("driver-sub-001", req, empty);

        assertThat(response.photoUrl()).isNull();
        verifyNoInteractions(r2StorageService);
    }

    @Test
    @DisplayName("create - photo exceeds 10 MB - throws IllegalArgumentException before saving")
    void create_photoTooLarge_throwsBeforeSave() {
        MockMultipartFile big = new MockMultipartFile(
            "photo", "big.jpg", "image/jpeg", new byte[11 * 1024 * 1024]
        );
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A01", "other", null, "desc"
        );

        assertThatThrownBy(() -> reportService.create("driver-sub-001", req, big))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("10 MB");

        verifyNoInteractions(alertRepository, messagingTemplate);
    }

    @Test
    @DisplayName("create - PDF file - throws IllegalArgumentException")
    void create_pdfFile_throwsIllegalArgument() {
        MockMultipartFile pdf = new MockMultipartFile(
            "photo", "doc.pdf", "application/pdf", new byte[100]
        );
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A01", "other", null, "desc"
        );

        assertThatThrownBy(() -> reportService.create("driver-sub-001", req, pdf))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("image");
    }

    @ParameterizedTest
    @ValueSource(strings = {"INVALID", "sensor_fault", "acessible", ""})
    @DisplayName("create - unknown violationType - throws IllegalArgumentException")
    void create_unknownViolationType_throws(String badType) {
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A01", badType, null, "desc"
        );

        assertThatThrownBy(() -> reportService.create("driver-sub-001", req, null))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining(badType);
    }

    @Test
    @DisplayName("create - user not found - throws ResourceNotFoundException without touching DB")
    void create_userNotFound_throws() {
        when(userRepository.findByAuthentikUserId("driver-sub-001")).thenReturn(Optional.empty());
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A01", "other", null, "desc"
        );

        assertThatThrownBy(() -> reportService.create("driver-sub-001", req, null))
            .isInstanceOf(ResourceNotFoundException.class);

        verifyNoInteractions(alertRepository, messagingTemplate);
    }

    @Test
    @DisplayName("create - parking lot not found - throws ResourceNotFoundException")
    void create_parkNotFound_throws() {
        when(parkingLotRepository.findById(parkingLot.getId())).thenReturn(Optional.empty());
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A01", "other", null, "desc"
        );

        assertThatThrownBy(() -> reportService.create("driver-sub-001", req, null))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining(parkingLot.getId().toString());

        verifyNoInteractions(alertRepository, messagingTemplate);
    }

    @Test
    @DisplayName("create - attributedTo is set from park technician name")
    void create_attributedToIsTechnicianName() {
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A12", "accessible", null, "desc"
        );

        reportService.create("driver-sub-001", req, null);

        verify(alertRepository).save(argThat(alert ->
            "Laura Farias".equals(alert.getAttributedTo())
        ));
    }

    @Test
    @DisplayName("create - park without technician - throws ResourceNotFoundException")
    void create_parkWithoutTechnician_throws() {
        parkingLot.setTechnician(null);
        CreateReportRequest req = new CreateReportRequest(
            parkingLot.getId(), "A", "A12", "accessible", null, "desc"
        );

        assertThatThrownBy(() -> reportService.create("driver-sub-001", req, null))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("no assigned technician");

        verifyNoInteractions(alertRepository, messagingTemplate);
    }
}
