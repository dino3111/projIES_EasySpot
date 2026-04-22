package pt.ua.deti.apieasyspot.billing.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.billing.dto.DriverSpendingResponse;
import pt.ua.deti.apieasyspot.billing.service.DriverSpendingService;

@RestController
@RequestMapping("/api/driver/costs")
@RequiredArgsConstructor
@Tag(name = "Driver Costs", description = "Driver spending analytics")
public class DriverSpendingController {

    private final DriverSpendingService driverSpendingService;

    @Operation(summary = "Get driver spending analytics")
    @GetMapping("/spending")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverSpendingResponse> getSpending(
        @AuthenticationPrincipal Jwt jwt,
        @RequestParam(required = false) String vehicleId,
        @RequestParam(required = false) String timeWindow,
        @RequestParam(required = false) String from,
        @RequestParam(required = false) String to
    ) {
        return ResponseEntity.ok(driverSpendingService.getSpending(jwt.getSubject(), vehicleId, timeWindow, from, to));
    }
}
