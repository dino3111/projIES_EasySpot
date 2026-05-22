package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;
import pt.ua.deti.apieasyspot.notification.model.SummaryFrequency;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.WeekFields;
import java.util.List;
import java.util.Locale;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertSummarySchedulerService {

    private static final DateTimeFormatter SCHEDULE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final AlertSubscriptionRepository alertSubscriptionRepository;
    private final EmailDeliveryDedupService emailDeliveryDedupService;

    @Scheduled(cron = "${alerts.summary.cron:0 * * * * *}")
    public void runScheduledSummaries() {
        runDueSummaries(Instant.now());
    }

    public int runDueSummaries(Instant now) {
        List<AlertSubscription> subscriptions = alertSubscriptionRepository
            .findByEnabledTrueAndAlertTypeAndScheduleTimeIsNotNullAndScheduleTimezoneIsNotNull(
                AlertSubscriptionType.DAILY_SUMMARY
            );
        int sent = 0;
        for (AlertSubscription subscription : subscriptions) {
            if (!isDue(subscription, now)) {
                continue;
            }
            if (sendSummaryMail(subscription, now)) {
                sent++;
            }
        }
        return sent;
    }

    private boolean isDue(AlertSubscription subscription, Instant now) {
        if (!StringUtils.hasText(subscription.getScheduleTime()) || !StringUtils.hasText(subscription.getScheduleTimezone())) {
            return false;
        }

        try {
            ZoneId zoneId = ZoneId.of(subscription.getScheduleTimezone());
            LocalTime configured = LocalTime.parse(subscription.getScheduleTime(), SCHEDULE_TIME_FORMATTER);
            ZonedDateTime zonedNow = now.atZone(zoneId);
            boolean sameMinute = zonedNow.getHour() == configured.getHour() && zonedNow.getMinute() == configured.getMinute();
            if (!sameMinute) {
                return false;
            }
            if (subscription.getScheduleFrequency() == SummaryFrequency.WEEKLY) {
                return zonedNow.getDayOfWeek() == DayOfWeek.MONDAY;
            }
            return true;
        } catch (DateTimeException ex) {
            log.warn("Skipping DAILY_SUMMARY subscription due to scheduler misconfiguration id={} timezone={} time={}",
                subscription.getId(), subscription.getScheduleTimezone(), subscription.getScheduleTime());
            return false;
        }
    }

    private boolean sendSummaryMail(AlertSubscription subscription, Instant now) {
        String deliveryKey = buildDeliveryKey(subscription, now);
        return emailDeliveryDedupService.sendOnce(
            deliveryKey,
            "DAILY_SUMMARY",
            subscription.getEmail(),
            "EasySpot availability summary",
            buildSummaryBody(subscription, now)
        );
    }

    private String buildSummaryBody(AlertSubscription subscription, Instant now) {
        String scope = StringUtils.hasText(subscription.getParkIdsCsv()) ? subscription.getParkIdsCsv() : "ALL_PARKS";
        return "Summary generated at " + now + "\nScope: " + scope + "\n";
    }

    private String buildDeliveryKey(AlertSubscription subscription, Instant now) {
        ZonedDateTime zonedNow = now.atZone(ZoneId.of(subscription.getScheduleTimezone()));
        String slot = subscription.getScheduleFrequency() == SummaryFrequency.WEEKLY
            ? zonedNow.get(WeekFields.ISO.weekBasedYear()) + "-W" + String.format(Locale.ROOT, "%02d", zonedNow.get(WeekFields.ISO.weekOfWeekBasedYear()))
            : zonedNow.toLocalDate().toString();
        return "alert-summary:" + subscription.getId() + ":" + slot;
    }
}
