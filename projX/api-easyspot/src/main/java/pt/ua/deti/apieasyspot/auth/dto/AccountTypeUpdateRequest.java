package pt.ua.deti.apieasyspot.auth.dto;

import jakarta.validation.constraints.NotNull;
import pt.ua.deti.apieasyspot.auth.model.UserRole;

public record AccountTypeUpdateRequest(
    @NotNull UserRole role,
    String userId
) {}
