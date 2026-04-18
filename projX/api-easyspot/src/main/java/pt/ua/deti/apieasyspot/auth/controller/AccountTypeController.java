package pt.ua.deti.apieasyspot.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.auth.dto.AccountTypeResponse;
import pt.ua.deti.apieasyspot.auth.dto.AccountTypeUpdateRequest;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.model.UserRole;
import pt.ua.deti.apieasyspot.auth.service.UserProfileService;

@Tag(name = "Auth", description = "Authenticated user profile management")
@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
public class AccountTypeController {

    private final UserProfileService userProfileService;

    @Operation(summary = "Set or update the authenticated user's role")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Role updated successfully"),
        @ApiResponse(responseCode = "400", description = "Invalid or missing role"),
        @ApiResponse(responseCode = "401", description = "Unauthenticated"),
        @ApiResponse(responseCode = "404", description = "User not found")
    })
    @PostMapping("/type")
    public ResponseEntity<AccountTypeResponse> updateAccountType(
        @RequestBody @Valid AccountTypeUpdateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        User user = userProfileService.updateRole(jwt.getSubject(), request.role());
        return ResponseEntity.ok(toResponse(user));
    }

    private AccountTypeResponse toResponse(User user) {
        return new AccountTypeResponse(
            user.getId().toString(),
            user.getEmail(),
            UserRole.fromValue(user.getRole()),
            user.getUpdatedAt()
        );
    }
}
