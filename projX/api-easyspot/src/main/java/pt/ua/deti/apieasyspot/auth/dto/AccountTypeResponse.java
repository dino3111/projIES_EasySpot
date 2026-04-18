package pt.ua.deti.apieasyspot.auth.dto;

import java.time.LocalDateTime;

public record AccountTypeResponse(
    String id,
    String email,
    String role,
    LocalDateTime updatedAt
) {}
