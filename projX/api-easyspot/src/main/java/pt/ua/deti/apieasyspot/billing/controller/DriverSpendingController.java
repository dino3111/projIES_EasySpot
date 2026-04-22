package pt.ua.deti.apieasyspot.billing.controller;

import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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

    @Operation(
        summary = "Get driver spending analytics",
        description = """
            Returns spending analytics for the authenticated driver, including totals, insights,
            daily time-series and breakdowns by park and vehicle.
                        
            Filtering rules:
            - Use `timeWindow` for predefined windows: 7D, 30D, 3M, 6M, 12M.
            - Or use custom `from` and `to` (ISO8601).
            - `timeWindow` cannot be combined with `from`/`to`.
            """
    )
    @ApiResponses({
        @ApiResponse(
            responseCode = "200",
            description = "Spending analytics retrieved successfully",
            content = @Content(schema = @Schema(implementation = DriverSpendingResponse.class))
        ),
        @ApiResponse(responseCode = "400", description = "Invalid query parameters or date range"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid JWT"),
        @ApiResponse(responseCode = "403", description = "User is authenticated but not a DRIVER"),
        @ApiResponse(responseCode = "404", description = "Requested vehicleId does not belong to the authenticated driver")
    })
    @GetMapping("/spending")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverSpendingResponse> getSpending(
        @AuthenticationPrincipal Jwt jwt,
        @Parameter(
            description = "Optional vehicle UUID filter; must belong to authenticated driver",
            example = "9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57"
        )
        @RequestParam(required = false) String vehicleId,
        @Parameter(
            description = "Predefined time window. Allowed: 7D, 30D, 3M, 6M, 12M",
            example = "30D",
            schema = @Schema(allowableValues = {"7D", "30D", "3M", "6M", "12M"})
        )
        @RequestParam(required = false) String timeWindow,
        @Parameter(
            description = "Custom range start (ISO8601 date/datetime). Must be used with `to` and without `timeWindow`",
            example = "2026-01-01"
        )
        @RequestParam(required = false) String from,
        @Parameter(
            description = "Custom range end (ISO8601 date/datetime). Must be used with `from` and without `timeWindow`",
            example = "2026-01-31"
        )
        @RequestParam(required = false) String to,
        @Parameter(description = "Zero-based page index for history results", example = "0")
        @RequestParam(defaultValue = "0") int historyPage,
        @Parameter(description = "Number of history items per page (1–200)", example = "50")
        @RequestParam(defaultValue = "50") int historySize
    ) {
        return ResponseEntity.ok(
            driverSpendingService.getSpending(jwt.getSubject(), vehicleId, timeWindow, from, to, historyPage, historySize));
    }
}
