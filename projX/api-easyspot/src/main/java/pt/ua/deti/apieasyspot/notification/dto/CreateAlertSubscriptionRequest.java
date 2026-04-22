package pt.ua.deti.apieasyspot.notification.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;

import java.util.List;

public record CreateAlertSubscriptionRequest(
    @NotNull AlertSubscriptionType alertType,
    List<String> parkIds,
    String vehicleId,
    @Email String email,
    @Valid AlertScheduleRequest schedule
) {}
