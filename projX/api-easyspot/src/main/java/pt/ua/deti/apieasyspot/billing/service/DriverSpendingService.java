package pt.ua.deti.apieasyspot.billing.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.dto.DriverSpendingResponse;
import pt.ua.deti.apieasyspot.billing.dto.SpendingTimeWindow;
import pt.ua.deti.apieasyspot.billing.repository.DriverSpendingRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DriverSpendingService {

    private static final SpendingTimeWindow DEFAULT_WINDOW = SpendingTimeWindow.DAYS_30;

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final DriverSpendingRepository repository;

    public DriverSpendingResponse getSpending(
        String authentikUserId,
        String vehicleIdRaw,
        String timeWindowRaw,
        String fromRaw,
        String toRaw
    ) {
        User user = userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));

        UUID vehicleId = resolveVehicleId(user.getId(), vehicleIdRaw);
        TimeRange range = resolveRange(timeWindowRaw, fromRaw, toRaw);

        DriverSpendingRepository.TotalsRow totals = repository.totals(user.getId(), vehicleId, range.fromInclusive(), range.toExclusive());
        BigDecimal avg = totals.sessions() > 0
            ? totals.totalSpent().divide(BigDecimal.valueOf(totals.sessions()), 2, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        String mostUsedPark = repository.mostUsedPark(user.getId(), vehicleId, range.fromInclusive(), range.toExclusive());
        DriverSpendingRepository.CostliestSessionRow costliest =
            repository.costliestSession(user.getId(), vehicleId, range.fromInclusive(), range.toExclusive());

        return new DriverSpendingResponse(
            new DriverSpendingResponse.Totals(
                safe(totals.totalSpent()),
                safe(avg),
                safe(totals.parkingSpent()),
                safe(totals.chargingSpent())
            ),
            new DriverSpendingResponse.Insights(
                mostUsedPark,
                costliest == null ? null : new DriverSpendingResponse.CostliestSession(
                    costliest.parkName(), costliest.date(), costliest.vehicle(), safe(costliest.totalSpent())
                ),
                totals.sessions()
            ),
            repository.timeseries(user.getId(), vehicleId, range.fromInclusive(), range.toExclusive()).stream()
                .map(row -> new DriverSpendingResponse.TimeseriesPoint(row.date(), safe(row.totalSpent())))
                .toList(),
            repository.breakdownByPark(user.getId(), vehicleId, range.fromInclusive(), range.toExclusive()).stream()
                .map(row -> new DriverSpendingResponse.ParkBreakdown(row.parkId(), row.parkName(), safe(row.totalSpent())))
                .toList(),
            repository.breakdownByVehicle(user.getId(), vehicleId, range.fromInclusive(), range.toExclusive()).stream()
                .map(row -> new DriverSpendingResponse.VehicleBreakdown(row.vehicleId(), row.licensePlate(), safe(row.totalSpent())))
                .toList(),
            repository.history(user.getId(), vehicleId, range.fromInclusive(), range.toExclusive()).stream()
                .map(row -> new DriverSpendingResponse.HistoryItem(
                    row.parkName(), row.date(), row.durationMinutes(), row.vehicle(), safe(row.totalSpent()), row.status()
                ))
                .toList()
        );
    }

    TimeRange resolveRange(String timeWindowRaw, String fromRaw, String toRaw) {
        boolean hasCustom = !isBlank(fromRaw) || !isBlank(toRaw);
        if (hasCustom && !isBlank(timeWindowRaw)) {
            throw new IllegalArgumentException("Use either timeWindow or from/to, not both");
        }

        if (hasCustom) {
            if (isBlank(fromRaw) || isBlank(toRaw)) {
                throw new IllegalArgumentException("Both from and to must be provided for custom ranges");
            }
            ParsedDate from = parseDate(fromRaw);
            ParsedDate to = parseDate(toRaw);
            OffsetDateTime fromInclusive = from.value();
            OffsetDateTime toExclusive = to.isDateOnly() ? to.value().plusDays(1) : to.value();
            if (!fromInclusive.isBefore(toExclusive)) {
                throw new IllegalArgumentException("Invalid range: from must be before to");
            }
            return new TimeRange(fromInclusive, toExclusive);
        }

        SpendingTimeWindow window = isBlank(timeWindowRaw)
            ? DEFAULT_WINDOW
            : SpendingTimeWindow.fromParam(timeWindowRaw.trim().toUpperCase());

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        OffsetDateTime fromInclusive = switch (window) {
            case DAYS_7 -> now.minusDays(7);
            case DAYS_30 -> now.minusDays(30);
            case MONTHS_3 -> now.minusMonths(3);
            case MONTHS_6 -> now.minusMonths(6);
            case MONTHS_12 -> now.minusMonths(12);
        };
        return new TimeRange(fromInclusive, now);
    }

    private UUID resolveVehicleId(UUID userId, String vehicleIdRaw) {
        if (isBlank(vehicleIdRaw)) {
            return null;
        }
        UUID vehicleId;
        try {
            vehicleId = UUID.fromString(vehicleIdRaw.trim());
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException("vehicleId must be a valid UUID");
        }
        vehicleRepository.findByIdAndUserId(vehicleId, userId)
            .orElseThrow(() -> new ResourceNotFoundException("Unknown vehicleId: " + vehicleId));
        return vehicleId;
    }

    private ParsedDate parseDate(String raw) {
        try {
            return new ParsedDate(OffsetDateTime.parse(raw), false);
        } catch (DateTimeParseException ignored) {
        }
        try {
            LocalDate date = LocalDate.parse(raw);
            return new ParsedDate(OffsetDateTime.of(date, LocalTime.MIN, ZoneOffset.UTC), true);
        } catch (DateTimeParseException ex) {
            throw new IllegalArgumentException("Invalid ISO8601 date: " + raw);
        }
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    record TimeRange(OffsetDateTime fromInclusive, OffsetDateTime toExclusive) {}
    private record ParsedDate(OffsetDateTime value, boolean isDateOnly) {}
}
