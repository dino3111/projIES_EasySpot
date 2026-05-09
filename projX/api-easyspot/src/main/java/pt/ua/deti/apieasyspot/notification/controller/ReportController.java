package pt.ua.deti.apieasyspot.notification.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import pt.ua.deti.apieasyspot.notification.dto.CreateReportRequest;
import pt.ua.deti.apieasyspot.notification.dto.ReportResponse;
import pt.ua.deti.apieasyspot.notification.service.ReportService;

import java.util.UUID;

@Tag(name = "Reports", description = "Driver unauthorized parking reports")
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Validated
public class ReportController {
    private final ReportService reportService;

    @Operation(summary = "Submit an unauthorized parking report")
    @ApiResponse(responseCode = "201", description = "Report submitted")
    @ApiResponse(responseCode = "400", description = "Invalid violation type or file")
    @ApiResponse(responseCode = "401", description = "Unauthenticated")
    @ApiResponse(responseCode = "404", description = "Parking lot not found")
    @ApiResponse(responseCode = "413", description = "Photo exceeds 10 MB")
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<ReportResponse> create(
        @RequestParam UUID parkingLotId,
        @RequestParam @NotBlank String zone,
        @RequestParam @NotBlank String spotNumber,
        @RequestParam @NotBlank String violationType,
        @RequestParam(required = false) String vehiclePlate,
        @RequestParam @NotBlank String description,
        @RequestParam(value = "photo", required = false) MultipartFile photo,
        @AuthenticationPrincipal Jwt jwt
    ){
        CreateReportRequest request = new CreateReportRequest(
            parkingLotId, zone, spotNumber, violationType, vehiclePlate, description
        );
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(reportService.create(jwt.getSubject(), request, photo));
    }
}
