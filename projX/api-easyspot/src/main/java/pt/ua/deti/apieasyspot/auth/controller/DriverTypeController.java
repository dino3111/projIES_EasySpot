package pt.ua.deti.apieasyspot.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.auth.dto.DriverTypeResponse;
import pt.ua.deti.apieasyspot.auth.dto.DriverTypeUpdateRequest;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.service.UserProfileService;

@Tag(name = "Auth", description = "Authenticated user profile management")
@RestController
@RequestMapping("/api/driver")
@RequiredArgsConstructor
public class DriverTypeController {

    private final UserProfileService userProfileService;

    @Operation(summary = "Update authenticated driver type")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Driver type updated"),
        @ApiResponse(responseCode = "400", description = "Invalid driver type payload"),
        @ApiResponse(responseCode = "401", description = "Unauthenticated"),
        @ApiResponse(responseCode = "403", description = "Only DRIVER role can update this value"),
        @ApiResponse(responseCode = "404", description = "Authenticated user not found")
    })
    @PostMapping("/type")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverTypeResponse> updateDriverType(
        @RequestBody @Valid DriverTypeUpdateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        String authentikUserId = request.userId() != null ? request.userId() : jwt.getSubject();
        User user = userProfileService.updateDriverType(authentikUserId, request.driverType());
        return ResponseEntity.ok(toResponse(user));
    }

    private DriverTypeResponse toResponse(User user) {
        return new DriverTypeResponse(
            user.getId().toString(),
            user.getName(),
            user.getEmail(),
            user.getRole(),
            user.getDriverType()
        );
    }
}