package pt.ua.deti.apieasyspot.analytics.controller;

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
import pt.ua.deti.apieasyspot.analytics.dto.ManagerDashboardResponse;
import pt.ua.deti.apieasyspot.analytics.service.AnalyticsService;


@Tag(name = "Manager", description = "Manager analytics dashboard")
@RestController
@RequestMapping("/api/manager/")
@RequiredArgsConstructor
public class ManagerDashboardController{
    private final AnalyticsService analyticsService;

    @Operation(summary = "Manager KPI dashboard")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Dashboard data"),
        @ApiResponse(responseCode = "401", description = "Not authenticated"),
        @ApiResponse(responseCode = "403", description = "Not a manager")
    })
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ManagerDashboardResponse> getDashboard(){
        return ResponseEntity.ok(analyticsService.buildDashboard());
    }
}

