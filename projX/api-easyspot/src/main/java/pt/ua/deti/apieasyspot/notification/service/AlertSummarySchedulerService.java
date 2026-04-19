package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;
import pt.ua.deti.apieasyspot.notification.model.SummaryFrequency;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AlertSummarySchedulerService {

    private static final DateTimeFormatter SCHEDULE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final AlertSubscriptionRepository alertSubscriptionRepository;
    private final JavaMailSender mailSender;

    @Scheduled(cron = "${alerts.summary.cron:0 * * * * *}")
    public void runScheduledSummaries() {
        runDueSummaries(Instant.now());
    }

    public int runDueSummaries(Instant now) {
        List<AlertSubscription> subscriptions = alertSubscriptionRepository
            .findByEnabledTrueAndAlertType(AlertSubscriptionType.DAILY_SUMMARY);
        int sent = 0;
        for (AlertSubscription subscription : subscriptions) {
            if (!isDue(subscription, now)) {
                continue;
            }
            sendSummaryMail(subscription, now);
            sent++;
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

    private void sendSummaryMail(AlertSubscription subscription, Instant now) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(subscription.getEmail());
        message.setSubject("EasySpot availability summary");
        message.setText(buildSummaryBody(subscription, now));
        mailSender.send(message);
    }

    private String buildSummaryBody(AlertSubscription subscription, Instant now) {
        String scope = StringUtils.hasText(subscription.getParkIdsCsv()) ? subscription.getParkIdsCsv() : "ALL_PARKS";
        return "Summary generated at " + now + "\nScope: " + scope + "\n";
    }
}
