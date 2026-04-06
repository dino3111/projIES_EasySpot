package pt.ua.deti.apieasyspot.technician.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.technician.dto.TechnicianDashboardResponse;
import pt.ua.deti.apieasyspot.technician.service.TechnicianService;

@Tag(name = "Technician", description = "Technician operations dashboard")
@RestController
@RequestMapping("/api/technician")
@RequiredArgsConstructor
public class TechnicianDashboardController {
    private final TechnicianService technicianService;

    @Operation(summary = "Technician KPI dashboard")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Dashboard data"),
        @ApiResponse(responseCode = "401", description = "Not a authenticated"),
        @ApiResponse(responseCode = "403", description = "Not a technician")
    })
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('TECHNICAL')")
    public ResponseEntity<TechnicianDashboardResponse> getDashboard(){
        return ResponseEntity.ok(technicianService.buildDashboard());
    }
}
