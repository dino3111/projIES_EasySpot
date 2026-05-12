package pt.ua.deti.apieasyspot.occupancy.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateTechnicianRequest(
    @NotBlank String username,
    @NotBlank String name,
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8) String temporaryPassword,
    List<UUID> parkIds
) {}
