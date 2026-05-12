package pt.ua.deti.apieasyspot.occupancy.dto;

import java.util.List;
import java.util.UUID;

public record TechnicianDetailResponse(
    UUID id,
    String name,
    String email,
    String username,
    List<UUID> parkIds
) {}
