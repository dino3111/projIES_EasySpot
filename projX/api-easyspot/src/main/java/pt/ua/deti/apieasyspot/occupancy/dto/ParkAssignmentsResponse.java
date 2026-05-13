package pt.ua.deti.apieasyspot.occupancy.dto;

import java.util.List;
import java.util.UUID;

public record ParkAssignmentsResponse(UUID parkId, List<TechnicianSummaryResponse> technicians) {}
