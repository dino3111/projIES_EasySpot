package pt.ua.deti.apieasyspot.occupancy.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.occupancy.dto.TariffResponse;
import pt.ua.deti.apieasyspot.occupancy.dto.UpdateTariffRequest;
import pt.ua.deti.apieasyspot.occupancy.model.ParkStatus;
import pt.ua.deti.apieasyspot.occupancy.service.ManagerTariffService;

import java.util.UUID;

@Tag(name = "Manager", description = "Manager tariff management")
@RestController
@RequestMapping("/api/manager/tariffs")
@RequiredArgsConstructor
public class ManagerTariffController {

    private final ManagerTariffService managerTariffService;

    @Operation(summary = "List tariffs by parking lot (filter/search)")
    @ApiResponse(responseCode = "200", description = "List of tariffs")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Page<TariffResponse>> listTariffs(
            @RequestParam(required = false) UUID parkId,
            @RequestParam(required = false) String district,
            @RequestParam(required = false) ParkStatus parkStatus,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(managerTariffService.listTariffs(parkId, district, parkStatus, pageable));
    }

    @Operation(summary = "Update tariffs (hourly, max daily, monthly, pricePerKwh, status)")
    @ApiResponse(responseCode = "200", description = "Tariff updated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid request")
    @ApiResponse(responseCode = "404", description = "Park not found")
    @ApiResponse(responseCode = "401", description = "Not authenticated")
    @ApiResponse(responseCode = "403", description = "Not a manager")
    @PutMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<TariffResponse> updateTariff(
            @Valid @RequestBody UpdateTariffRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(managerTariffService.updateTariff(request, jwt.getSubject()));
    }
}
