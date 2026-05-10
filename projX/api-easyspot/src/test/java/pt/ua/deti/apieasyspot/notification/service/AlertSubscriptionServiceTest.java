package pt.ua.deti.apieasyspot.notification.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.notification.dto.AlertScheduleRequest;
import pt.ua.deti.apieasyspot.notification.dto.CreateAlertSubscriptionRequest;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;
import pt.ua.deti.apieasyspot.notification.model.SummaryFrequency;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertSubscriptionServiceTest {

    @Mock
    private AlertSubscriptionRepository alertSubscriptionRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private AlertSubscriptionService service;

    private User driver;

    @BeforeEach
    void setUp() {
        driver = new User();
        driver.setId(UUID.randomUUID());
        driver.setAuthentikUserId("driver-sub-1");
        driver.setEmail("driver@easyspot.pt");
        when(userRepository.findByAuthentikUserId("driver-sub-1")).thenReturn(Optional.of(driver));
        lenient().when(alertSubscriptionRepository.save(any(AlertSubscription.class))).thenAnswer(invocation -> {
            AlertSubscription s = invocation.getArgument(0);
            s.setId(UUID.randomUUID());
            s.setCreatedAt(LocalDateTime.now());
            return s;
        });
    }

    @Test
    @DisplayName("create - duplicate (same user/type/sorted parkIds) - updates existing subscription")
    void create_duplicateSortedParkIds_updatesExisting() {
        CreateAlertSubscriptionRequest request = new CreateAlertSubscriptionRequest(
            AlertSubscriptionType.SPACE_AVAILABLE,
            List.of("park-b", "park-a"),
            null,
            null,
            null
        );

        AlertSubscription existing = new AlertSubscription();
        existing.setId(UUID.randomUUID());
        existing.setUser(driver);
        existing.setAlertType(AlertSubscriptionType.SPACE_AVAILABLE);
        existing.setParkScopeKey("park-a|park-b");
        existing.setParkIdsCsv("park-a,park-b");
        existing.setEnabled(false);

        when(alertSubscriptionRepository.findFirstByUser_IdAndAlertTypeAndParkScopeKey(
            eq(driver.getId()),
            eq(AlertSubscriptionType.SPACE_AVAILABLE),
            eq("park-a|park-b")
        )).thenReturn(Optional.of(existing));

        var response = service.create("driver-sub-1", request);

        assertThat(response.alertSubscription().id()).isEqualTo(existing.getId());
        verify(alertSubscriptionRepository).save(existing);
    }

    @Test
    @DisplayName("create - DAILY_SUMMARY without schedule - throws IllegalArgumentException")
    void create_dailySummaryWithoutSchedule_throws() {
        CreateAlertSubscriptionRequest request = new CreateAlertSubscriptionRequest(
            AlertSubscriptionType.DAILY_SUMMARY,
            List.of("park-a"),
            null,
            "alerts@easyspot.pt",
            null
        );

        assertThatThrownBy(() -> service.create("driver-sub-1", request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Schedule is required");
    }

    @Test
    @DisplayName("create - invalid schedule timezone - throws IllegalArgumentException")
    void create_invalidTimezone_throws() {
        CreateAlertSubscriptionRequest request = new CreateAlertSubscriptionRequest(
            AlertSubscriptionType.DAILY_SUMMARY,
            List.of("park-a"),
            null,
            "alerts@easyspot.pt",
            new AlertScheduleRequest(SummaryFrequency.DAILY, "10:30", "Mars/Olympus")
        );

        assertThatThrownBy(() -> service.create("driver-sub-1", request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Invalid schedule timezone");
    }

    @Test
    @DisplayName("create - blank parkId element - throws IllegalArgumentException")
    void create_blankParkId_throws() {
        CreateAlertSubscriptionRequest request = new CreateAlertSubscriptionRequest(
            AlertSubscriptionType.SPACE_AVAILABLE,
            List.of("park-a", " "),
            null,
            null,
            null
        );

        assertThatThrownBy(() -> service.create("driver-sub-1", request))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("parkIds");
    }

    @Test
    @DisplayName("create - no email provided - defaults to user profile email")
    void create_defaultEmailFromProfile() {
        CreateAlertSubscriptionRequest request = new CreateAlertSubscriptionRequest(
            AlertSubscriptionType.LOT_FULL,
            List.of("park-a"),
            null,
            null,
            null
        );

        var response = service.create("driver-sub-1", request);

        assertThat(response.alertSubscription().id()).isNotNull();
        verify(alertSubscriptionRepository).save(any(AlertSubscription.class));
    }
}
