package pt.ua.deti.apieasyspot.notification.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ConflictException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.notification.dto.AlertScheduleRequest;
import pt.ua.deti.apieasyspot.notification.dto.AlertSubscriptionResponse;
import pt.ua.deti.apieasyspot.notification.dto.CreateAlertSubscriptionRequest;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;

import java.time.DateTimeException;
import java.time.LocalTime;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AlertSubscriptionService {

    private static final DateTimeFormatter SCHEDULE_TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm", Locale.ROOT);

    private final AlertSubscriptionRepository alertSubscriptionRepository;
    private final UserRepository userRepository;

    @Transactional
    public AlertSubscriptionResponse create(String authentikUserId, CreateAlertSubscriptionRequest request) {
        User user = userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));

        List<String> normalizedParkIds = normalizeParkIds(request.parkIds());
        String parkScopeKey = parkScopeKey(normalizedParkIds);
        validateSchedule(request.alertType(), request.schedule());

        if (alertSubscriptionRepository.existsByUser_IdAndAlertTypeAndParkScopeKey(
            user.getId(), request.alertType(), parkScopeKey
        )) {
            throw new ConflictException("Alert subscription already exists for this user, type and park scope");
        }

        String effectiveEmail = StringUtils.hasText(request.email()) ? request.email().trim() : user.getEmail();
        AlertSubscription subscription = buildEntity(user, request, normalizedParkIds, parkScopeKey, effectiveEmail);

        try {
            AlertSubscription saved = alertSubscriptionRepository.save(subscription);
            return toResponse(saved);
        } catch (DataIntegrityViolationException ex) {
            throw new ConflictException("Alert subscription already exists for this user, type and park scope");
        }
    }

    private AlertSubscription buildEntity(
        User user,
        CreateAlertSubscriptionRequest request,
        List<String> normalizedParkIds,
        String parkScopeKey,
        String effectiveEmail
    ) {
        AlertSubscription subscription = new AlertSubscription();
        subscription.setUser(user);
        subscription.setAlertType(request.alertType());
        subscription.setParkIdsCsv(String.join(",", normalizedParkIds));
        subscription.setParkScopeKey(parkScopeKey);
        subscription.setVehicleId(trimToNull(request.vehicleId()));
        subscription.setEmail(effectiveEmail);
        subscription.setEnabled(true);

        if (request.schedule() != null) {
            subscription.setScheduleFrequency(request.schedule().frequency());
            subscription.setScheduleTime(request.schedule().time());
            subscription.setScheduleTimezone(request.schedule().timezone());
        }

        return subscription;
    }

    private void validateSchedule(AlertSubscriptionType alertType, AlertScheduleRequest schedule) {
        if (alertType == AlertSubscriptionType.DAILY_SUMMARY && schedule == null) {
            throw new IllegalArgumentException("Schedule is required for DAILY_SUMMARY alerts");
        }
        if (alertType != AlertSubscriptionType.DAILY_SUMMARY && schedule != null) {
            throw new IllegalArgumentException("Schedule is only supported for DAILY_SUMMARY alerts");
        }
        if (schedule == null) {
            return;
        }

        if (schedule.frequency() == null) {
            throw new IllegalArgumentException("schedule.frequency is required");
        }
        if (!StringUtils.hasText(schedule.time())) {
            throw new IllegalArgumentException("schedule.time is required");
        }
        if (!StringUtils.hasText(schedule.timezone())) {
            throw new IllegalArgumentException("schedule.timezone is required");
        }

        parseScheduleTime(schedule.time());
        try {
            ZoneId.of(schedule.timezone());
        } catch (DateTimeException ex) {
            throw new IllegalArgumentException("Invalid schedule timezone: " + schedule.timezone());
        }
    }

    private LocalTime parseScheduleTime(String rawTime) {
        try {
            return LocalTime.parse(rawTime, SCHEDULE_TIME_FORMATTER);
        } catch (DateTimeException ex) {
            throw new IllegalArgumentException("Invalid schedule time, expected HH:mm");
        }
    }

    private List<String> normalizeParkIds(List<String> parkIds) {
        if (parkIds == null || parkIds.isEmpty()) {
            return List.of();
        }

        List<String> normalized = parkIds.stream()
            .map(this::trimToNull)
            .filter(StringUtils::hasText)
            .distinct()
            .sorted(Comparator.naturalOrder())
            .toList();

        if (normalized.size() != parkIds.size()) {
            long blanks = parkIds.stream().filter(id -> !StringUtils.hasText(trimToNull(id))).count();
            if (blanks > 0) {
                throw new IllegalArgumentException("parkIds must not contain blank values");
            }
        }

        return normalized;
    }

    private String parkScopeKey(List<String> parkIds) {
        if (parkIds == null || parkIds.isEmpty()) {
            return "*";
        }
        return parkIds.stream().collect(Collectors.joining("|"));
    }

    private String trimToNull(String value) {
        if (!StringUtils.hasText(value)) {
            return null;
        }
        return value.trim();
    }

    private AlertSubscriptionResponse toResponse(AlertSubscription saved) {
        return new AlertSubscriptionResponse(
            new AlertSubscriptionResponse.AlertSubscriptionPayload(
                saved.getId(),
                saved.isEnabled(),
                saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now()
            )
        );
    }
}
