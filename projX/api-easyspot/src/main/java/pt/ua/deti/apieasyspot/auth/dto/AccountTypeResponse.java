package pt.ua.deti.apieasyspot.auth.dto;

import pt.ua.deti.apieasyspot.auth.model.UserRole;

import java.time.LocalDateTime;

public record AccountTypeResponse(
    String id,
    String email,
    UserRole role,
    LocalDateTime updatedAt
) {}
