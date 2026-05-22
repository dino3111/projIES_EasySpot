package pt.ua.deti.apieasyspot.notification.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;
import pt.ua.deti.apieasyspot.notification.model.SummaryFrequency;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AlertSummarySchedulerServiceTest {

    @Mock
    private AlertSubscriptionRepository alertSubscriptionRepository;

    @Mock
    private EmailDeliveryDedupService emailDeliveryDedupService;

    @InjectMocks
    private AlertSummarySchedulerService schedulerService;

    @Test
    void runDueSummaries_sendsOncePerSlot() {
        AlertSubscription subscription = subscription();
        when(alertSubscriptionRepository.findByEnabledTrueAndAlertTypeAndScheduleTimeIsNotNullAndScheduleTimezoneIsNotNull(
            AlertSubscriptionType.DAILY_SUMMARY
        ))
            .thenReturn(List.of(subscription));
        when(emailDeliveryDedupService.sendOnce(
            anyString(),
            eq("DAILY_SUMMARY"),
            eq("driver@example.com"),
            eq("EasySpot availability summary"),
            anyString()
        )).thenReturn(true);

        Instant now = Instant.parse("2026-05-11T09:00:00Z");

        int sent = schedulerService.runDueSummaries(now);

        assertThat(sent).isEqualTo(1);
    }

    @Test
    void runDueSummaries_skipsDuplicateSlotWhenDeliveryServiceDeclines() {
        AlertSubscription subscription = subscription();
        when(alertSubscriptionRepository.findByEnabledTrueAndAlertTypeAndScheduleTimeIsNotNullAndScheduleTimezoneIsNotNull(
            AlertSubscriptionType.DAILY_SUMMARY
        ))
            .thenReturn(List.of(subscription));
        when(emailDeliveryDedupService.sendOnce(
            anyString(),
            eq("DAILY_SUMMARY"),
            eq("driver@example.com"),
            eq("EasySpot availability summary"),
            anyString()
        )).thenReturn(false);

        Instant now = Instant.parse("2026-05-11T09:00:00Z");

        int sent = schedulerService.runDueSummaries(now);

        assertThat(sent).isZero();
    }

    private AlertSubscription subscription() {
        User user = new User();
        user.setId(UUID.randomUUID());

        AlertSubscription subscription = new AlertSubscription();
        subscription.setId(UUID.randomUUID());
        subscription.setUser(user);
        subscription.setAlertType(AlertSubscriptionType.DAILY_SUMMARY);
        subscription.setEmail("driver@example.com");
        subscription.setScheduleFrequency(SummaryFrequency.DAILY);
        subscription.setScheduleTime("09:00");
        subscription.setScheduleTimezone(ZoneOffset.UTC.getId());
        subscription.setEnabled(true);
        subscription.setParkScopeKey("ALL_PARKS");
        return subscription;
    }
}
