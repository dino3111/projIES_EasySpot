package pt.ua.deti.apieasyspot.notification.controller;


import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.notification.dto.AlertStateUpdate;
import pt.ua.deti.apieasyspot.notification.service.AlertService;

import java.util.UUID;

@Tag(name = "Alert", description = "Alert state management")
@RestController
@RequestMapping("/api/alert")
@RequiredArgsConstructor
public class AlertController {

    private final AlertService alertService;

    @Operation(summary = "Update alert state")
    @PatchMapping("/{id}/state")
    @PreAuthorize("hasAnyRole('TECHNICIAN', 'MANAGER')")
    public ResponseEntity<Void> updateState(@PathVariable UUID id, @RequestBody AlertStateUpdate body){
        alertService.updateState(id, body.state());
        return ResponseEntity.noContent().build();
    }

}
