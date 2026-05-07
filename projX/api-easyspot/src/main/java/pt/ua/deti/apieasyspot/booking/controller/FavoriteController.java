package pt.ua.deti.apieasyspot.booking.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.booking.dto.FavoriteToggleResponse;
import pt.ua.deti.apieasyspot.booking.service.FavoriteService;

import java.util.UUID;


@Tag(name = "Parks", description = "Driver parking lot interactions")
@RestController
@RequestMapping("/api/parks")
@RequiredArgsConstructor
public class FavoriteController {

    private final FavoriteService favoriteService;

    @Operation(
        summary = "Toggle favorite parking lot",
        description = "Adds or removes a parking lot from the authenticated driver's favorites"
    )
    @ApiResponse(responseCode = "200", description = "Favorite toggled")
    @ApiResponse(responseCode = "401", description = "Unauthenticated")
    @ApiResponse(responseCode = "403", description = "Not a driver")
    @ApiResponse(responseCode = "404", description = "Park not found")
    @PostMapping("/{id}/favorite")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<FavoriteToggleResponse> toggleFavorite(
        @PathVariable UUID id,
        @AuthenticationPrincipal Jwt jwt
    ) {
        String authentikUserId = jwt.getSubject();
        return ResponseEntity.ok(favoriteService.toggle(authentikUserId, id));
    }
}
