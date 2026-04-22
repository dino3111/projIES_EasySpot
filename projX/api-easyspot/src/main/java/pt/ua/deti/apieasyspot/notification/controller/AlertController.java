package pt.ua.deti.apieasyspot.notification.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.notification.dto.AlertSubscriptionResponse;
import pt.ua.deti.apieasyspot.notification.dto.AlertStateUpdate;
import pt.ua.deti.apieasyspot.notification.dto.CreateAlertSubscriptionRequest;
import pt.ua.deti.apieasyspot.notification.service.AlertService;
import pt.ua.deti.apieasyspot.notification.service.AlertSubscriptionService;

import java.util.UUID;

@Tag(name = "Alerts", description = "Alert state management")
@RestController
@RequestMapping("/api/alerts")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;
    private final AlertSubscriptionService alertSubscriptionService;

    @Operation(summary = "Create an alert subscription")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Alert subscription created successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid subscription request payload"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "403", description = "User is authenticated but not a DRIVER")
    })
    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<AlertSubscriptionResponse> createSubscription(
        @RequestBody @Valid CreateAlertSubscriptionRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        AlertSubscriptionResponse response = alertSubscriptionService.create(jwt.getSubject(), request);
        return ResponseEntity.ok(response);
    }

    @Operation(summary = "Update alert state")
    @ApiResponses({
        @ApiResponse(responseCode = "204", description = "Alert state updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid alert state payload"),
        @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token"),
        @ApiResponse(responseCode = "403", description = "User is authenticated but not a TECHNICAL or MANAGER"),
        @ApiResponse(responseCode = "404", description = "Alert not found")
    })
    @PatchMapping("/{id}/state")
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER')")
    public ResponseEntity<Void> updateState(
        @Parameter(description = "Alert UUID", example = "9f6a9a7b-c6a2-43a2-a2b6-f57e6d03df57")
        @PathVariable UUID id,
        @RequestBody AlertStateUpdate body
    ) {
        alertService.updateState(id, body.state());
        return ResponseEntity.noContent().build();
    }

}
