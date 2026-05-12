package pt.ua.deti.apieasyspot.billing.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.billing.dto.ManagerBillingSessionResponse;
import pt.ua.deti.apieasyspot.billing.service.ManagerBillingService;

import java.util.UUID;

@Tag(name = "Manager", description = "Manager billing sessions")
@RestController
@RequestMapping("/api/manager/billing")
@RequiredArgsConstructor
public class ManagerBillingController {

    private final ManagerBillingService managerBillingService;

    @Operation(summary = "List completed parking sessions for manager parks")
    @ApiResponse(responseCode = "200", description = "Paged billing sessions")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Page<ManagerBillingSessionResponse>> listBillingSessions(
            @RequestParam(required = false) UUID parkId,
            @RequestParam(defaultValue = "2") int days,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(managerBillingService.listBillingSessions(parkId, days, pageable));
    }
}
