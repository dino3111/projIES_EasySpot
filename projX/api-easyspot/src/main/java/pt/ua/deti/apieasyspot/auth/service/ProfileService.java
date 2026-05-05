package pt.ua.deti.apieasyspot.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.analytics.repository.AnalyticsRepository;
import pt.ua.deti.apieasyspot.analytics.repository.TechnicianRepository;
import pt.ua.deti.apieasyspot.auth.dto.*;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.ProfileRepository;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.booking.repository.UserFavoriteRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProfileService {

    private static final Set<String> VALID_ROLES = Set.of("DRIVER", "MANAGER", "TECHNICAL");

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final AnalyticsRepository analyticsRepository;
    private final TechnicianRepository technicianRepository;
    private final UserFavoriteRepository userFavoriteRepository;

    public Object getProfile(String authentikUserId, String jwtRole) {
        requireValidRole(jwtRole);
        User user = findUser(authentikUserId);
        return switch (jwtRole) {
            case "DRIVER" -> buildDriverProfile(user);
            case "MANAGER" -> buildManagerProfile(user);
            case "TECHNICAL" -> buildTechnicianProfile(user, authentikUserId);
            default -> throw new IllegalArgumentException("Unknown role: " + jwtRole);
        };
    }

    @Transactional
    public Object updateProfile(String authentikUserId, ProfileUpdateRequest request, String jwtRole) {
        requireValidRole(jwtRole);
        validateRoleFields(request, jwtRole);
        User user = findUser(authentikUserId);
        applyUpdates(user, request, jwtRole);
        userRepository.save(user);
        return getProfile(authentikUserId, jwtRole);
    }

    private void requireValidRole(String jwtRole) {
        if (!VALID_ROLES.contains(jwtRole)) {
            throw new IllegalArgumentException("Unknown role: " + jwtRole);
        }
    }

    private void validateRoleFields(ProfileUpdateRequest request, String jwtRole) {
        if (request.driverType() != null && !"DRIVER".equals(jwtRole)) {
            throw new IllegalArgumentException("driverType is only editable for DRIVER role");
        }
    }

    private void applyUpdates(User user, ProfileUpdateRequest request, String jwtRole) {
        if (request.notificationsEnabled() != null) {
            user.setNotificationsEnabled(request.notificationsEnabled());
            user.setPushNotificationsEnabled(request.notificationsEnabled());
            user.setEmailNotificationsEnabled(request.notificationsEnabled());
        }
        if (request.pushNotificationsEnabled() != null) {
            user.setPushNotificationsEnabled(request.pushNotificationsEnabled());
        }
        if (request.emailNotificationsEnabled() != null) {
            user.setEmailNotificationsEnabled(request.emailNotificationsEnabled());
        }
        if (request.photoUrl() != null) {
            user.setPhotoUrl(request.photoUrl());
        }
        if ("DRIVER".equals(jwtRole) && request.driverType() != null) {
            user.setDriverType(request.driverType());
        }
        user.setNotificationsEnabled(user.isPushNotificationsEnabled() || user.isEmailNotificationsEnabled());
    }

    private DriverProfileResponse buildDriverProfile(User user) {
        SpendingSummary spending = profileRepository.spendingSummary(user.getId());
        long favorites = userFavoriteRepository.countByUserId(user.getId());
        return new DriverProfileResponse(
            user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
            user.getDriverType(), user.isNotificationsEnabled(),
            user.isPushNotificationsEnabled(), user.isEmailNotificationsEnabled(),
            spending, favorites);
    }

    private ManagerProfileResponse buildManagerProfile(User user) {
        return new ManagerProfileResponse(
            user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
            user.isNotificationsEnabled(),
            analyticsRepository.countActiveLots(),
            analyticsRepository.revenueToday(),
            analyticsRepository.countEntriesToday(),
            analyticsRepository.countOpenAlerts());
    }

    private TechnicianProfileResponse buildTechnicianProfile(User user, String authentikUserId) {
        int total = technicianRepository.countTotalSensors();
        int operational = technicianRepository.countOperationalSensors();
        double uptimePct = total > 0 ? Math.round(operational * 1000.0 / total) / 10.0 : 0.0;
        return new TechnicianProfileResponse(
            user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
            user.isNotificationsEnabled(),
            profileRepository.countAssignedTasks(authentikUserId),
            new SensorSummary(total, operational, uptimePct),
            technicianRepository.countFailuresToday());
    }

    private User findUser(String authentikUserId) {
        return userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));
    }
}
