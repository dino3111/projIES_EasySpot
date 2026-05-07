package pt.ua.deti.apieasyspot.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.auth.dto.ProfileUpdateRequest;
import pt.ua.deti.apieasyspot.auth.service.ProfilePhotoService;
import pt.ua.deti.apieasyspot.auth.service.ProfileService;

import java.util.List;

@Tag(name = "Profile", description = "User profile and preferences")
@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final ProfilePhotoService profilePhotoService;

    @Operation(summary = "Get authenticated user profile (role-aware)")
    @ApiResponse(responseCode = "200", description = "Authenticated profile retrieved successfully")
    @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    @GetMapping
    public ResponseEntity<Object> getProfile(@AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(profileService.getProfile(jwt.getSubject(), extractRole(jwt)));
    }

    @Operation(summary = "Update authenticated user profile preferences")
    @ApiResponse(responseCode = "200", description = "Profile updated successfully")
    @ApiResponse(responseCode = "400", description = "Invalid profile update payload")
    @ApiResponse(responseCode = "401", description = "Missing or invalid authentication token")
    @PutMapping
    public ResponseEntity<Object> updateProfile(
        @RequestBody ProfileUpdateRequest request,
        @AuthenticationPrincipal Jwt jwt
    ) {
        return ResponseEntity.ok(
            profileService.updateProfile(jwt.getSubject(), request, extractRole(jwt)));
    }

    @Operation(summary = "Upload authenticated user profile photo")
    @ApiResponse(responseCode = "200", description = "Profile photo uploaded successfully")
    @ApiResponse(responseCode = "400", description = "Invalid or unsupported image file")
    @PostMapping("/photo")
    public ResponseEntity<Object> uploadPhoto(
        @RequestPart("photo") MultipartFile photo,
        @AuthenticationPrincipal Jwt jwt
    ) {
        String photoUrl = profilePhotoService.upload(jwt.getSubject(), photo);
        return ResponseEntity.ok(profileService.updateProfile(
            jwt.getSubject(),
            new ProfileUpdateRequest(null, null, null, null, photoUrl),
            extractRole(jwt)
        ));
    }

    private String extractRole(Jwt jwt) {
        List<String> groups = jwt.getClaimAsStringList("groups");
        if (groups == null || groups.isEmpty()) return "";
        return groups.get(0);
    }
}
