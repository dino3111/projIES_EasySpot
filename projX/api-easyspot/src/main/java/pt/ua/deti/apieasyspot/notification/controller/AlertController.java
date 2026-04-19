package pt.ua.deti.apieasyspot.notification.controller;


import io.swagger.v3.oas.annotations.Operation;
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
    @PatchMapping("/{id}/state")
    @PreAuthorize("hasAnyRole('TECHNICAL', 'MANAGER')")
    public ResponseEntity<Void> updateState(@PathVariable UUID id, @RequestBody AlertStateUpdate body){
        alertService.updateState(id, body.state());
        return ResponseEntity.noContent().build();
    }

}
