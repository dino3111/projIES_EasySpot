package pt.ua.deti.apieasyspot.notification.service;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ExternalServiceException;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;
import pt.ua.deti.apieasyspot.notification.dto.CreateReportRequest;
import pt.ua.deti.apieasyspot.notification.dto.ReportResponse;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.repository.AlertRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ReportService {

    private static final long MAX_PHOTO_BYTES = 10 * 1024 * 1024L;
    private static final Set<String> VALID_VIOLATION_TYPES = Set.of(
        "accessible", "reserved", "ev", "double-parked", "blocking", "other"
    );

    private final AlertRepository alertRepository;
    private final UserRepository userRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final R2StorageService r2StorageService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ReportResponse create(String authentikUserId, CreateReportRequest request, MultipartFile photo){
        validateViolationType(request.violationType());

        User driver = findUser(authentikUserId);
        ParkingLot parkingLot = findPark(request.parkingLotId());

        String photoUrl = (photo != null && !photo.isEmpty()) ? uploadPhoto(photo) : null;

        Alert alert = buildAlert(request, parkingLot, driver, photoUrl);
        Alert saved = alertRepository.save(alert);

        ReportResponse response = toResponse(saved);
        messagingTemplate.convertAndSend("/topic/reports", response);
        return response;
    }

    private void validateViolationType(String violationType){
        if(!VALID_VIOLATION_TYPES.contains(violationType)){
            throw new IllegalArgumentException("Invalid violation type: " + violationType);
        }
    }

    private void validatePhoto(MultipartFile photo){
        if(photo.getSize() > MAX_PHOTO_BYTES){
            throw new IllegalArgumentException("Photo size exceeds the limit of 10MB");
        }
        String contentType = photo.getContentType();

        if(contentType == null || !contentType.startsWith("image/")){
            throw new IllegalArgumentException("Only image files are accepted");
        }
    }

    private String uploadPhoto(MultipartFile photo){
        validatePhoto(photo);
        try{
            String key = "reports/" + UUID.randomUUID() + "_" + photo.getOriginalFilename();
            return r2StorageService.upload(key, photo.getBytes(), photo.getContentType());
        } catch (IOException e) {
            throw new ExternalServiceException("Failed to upload photo to R2", e);
        }
    }

    private Alert buildAlert(CreateReportRequest request, ParkingLot park, User driver, String photoUrl){
        Alert alert = new Alert();
        alert.setParkingLot(park);
        alert.setType(AlertType.CLIENT);
        alert.setSeverity(toSeverity(request.violationType()));
        alert.setState(StateAlert.OPEN);
        alert.setZone(request.zone());
        alert.setSpotNumber(request.spotNumber());
        alert.setPlate(request.vehiclePlate());
        alert.setDescription(request.description());
        alert.setPhotoUrl(photoUrl);
        alert.setAttributedTo(driver.getName());
        alert.setCreatedAt(LocalDateTime.now());
        return alert;
    }

    private SeverityAlert toSeverity(String violationType){
        return switch (violationType){
            case "blocking" -> SeverityAlert.CRITICAL;
            default -> SeverityAlert.WARNING;
        };
    }

    private User findUser(String authentikUserId){
        return userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("Authenticated user not found"));
    }

    private ParkingLot findPark(UUID parkingLotId){
        return parkingLotRepository.findById(parkingLotId)
            .orElseThrow(() -> new ResourceNotFoundException("Parking lot not found: " + parkingLotId));
    }

    private ReportResponse toResponse(Alert alert){
        return new ReportResponse(
            alert.getId(),
            alert.getType().name(),
            alert.getParkingLot().getId(),
            alert.getParkingLot().getName(),
            alert.getZone(),
            alert.getSpotNumber(),
            alert.getPlate(),
            alert.getDescription(),
            alert.getPhotoUrl(),
            alert.getSeverity().name(),
            alert.getState().name(),
            alert.getCreatedAt()
        );
    }

}
