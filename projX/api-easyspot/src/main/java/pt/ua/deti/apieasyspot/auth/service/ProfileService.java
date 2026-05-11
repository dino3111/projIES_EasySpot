package pt.ua.deti.apieasyspot.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.analytics.repository.AnalyticsRepository;
import pt.ua.deti.apieasyspot.analytics.repository.TechnicianParkAssignmentRepository;
import pt.ua.deti.apieasyspot.analytics.repository.TechnicianRepository;
import pt.ua.deti.apieasyspot.auth.dto.*;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.ProfileRepository;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.booking.repository.UserFavoriteRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ProfileService {

    private static final Set<String> VALID_ROLES = Set.of("DRIVER", "MANAGER", "TECHNICAL");

    private final UserRepository userRepository;
    private final ProfileRepository profileRepository;
    private final AnalyticsRepository analyticsRepository;
    private final TechnicianRepository technicianRepository;
    private final TechnicianParkAssignmentRepository technicianParkAssignmentRepository;
    private final UserFavoriteRepository userFavoriteRepository;

    public Object getProfile(String authentikUserId, String email, String jwtRole) {
        requireValidRole(jwtRole);
        User user = findAndSyncUser(authentikUserId, email);
        return buildProfileResponse(user, jwtRole, true, authentikUserId);
    }

    @Transactional
    public Object updateProfile(String authentikUserId, String email, ProfileUpdateRequest request, String jwtRole) {
        requireValidRole(jwtRole);
        validateRoleFields(request, jwtRole);
        User user = findAndSyncUser(authentikUserId, email);
        applyUpdates(user, request, jwtRole);
        userRepository.save(user);
        return buildProfileResponse(user, jwtRole, false, authentikUserId);
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

    private Object buildProfileResponse(User user, String jwtRole, boolean includeStats, String authentikUserId) {
        return switch (jwtRole) {
            case "DRIVER" -> buildDriverProfile(user, includeStats);
            case "MANAGER" -> buildManagerProfile(user, includeStats);
            case "TECHNICAL" -> buildTechnicianProfile(user, includeStats, authentikUserId);
            default -> throw new IllegalArgumentException("Unknown role: " + jwtRole);
        };
    }

    private DriverProfileResponse buildDriverProfile(User user, boolean includeStats) {
        SpendingSummary spending = new SpendingSummary(java.math.BigDecimal.ZERO, 0L, java.math.BigDecimal.ZERO);
        long favorites = 0L;
        if (includeStats) {
            try {
                SpendingSummary dbSpending = profileRepository.spendingSummary(user.getId());
                if (dbSpending != null) spending = dbSpending;
                favorites = userFavoriteRepository.countByUserId(user.getId());
            } catch (RuntimeException ex) {
                log.warn("Failed to load DRIVER profile stats for userId={}", user.getId(), ex);
            }
        }
        return new DriverProfileResponse(
            user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
            user.getDriverType(), user.isNotificationsEnabled(),
            user.isPushNotificationsEnabled(), user.isEmailNotificationsEnabled(),
            spending, favorites);
    }

    private DriverProfileResponse buildDriverProfile(User user) {
        return buildDriverProfile(user, true);
    }

    private ManagerProfileResponse buildManagerProfile(User user, boolean includeStats) {
        if (!includeStats) {
            return new ManagerProfileResponse(
                user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
                user.isNotificationsEnabled(), 0, java.math.BigDecimal.ZERO, 0L, 0L);
        }
        try {
        return new ManagerProfileResponse(
            user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
            user.isNotificationsEnabled(),
            analyticsRepository.countActiveLots(),
            analyticsRepository.revenueToday(),
            analyticsRepository.countEntriesToday(),
            analyticsRepository.countOpenAlerts());
        } catch (RuntimeException ex) {
            log.warn("Failed to load MANAGER profile stats for userId={}", user.getId(), ex);
            return new ManagerProfileResponse(
                user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
                user.isNotificationsEnabled(), 0, java.math.BigDecimal.ZERO, 0L, 0L);
        }
    }

    private TechnicianProfileResponse buildTechnicianProfile(User user, boolean includeStats, String authentikUserId) {
        if (!includeStats) {
            return new TechnicianProfileResponse(
                user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
                user.isNotificationsEnabled(),
                0L,
                new SensorSummary(0, 0, 0.0),
                0L);
        }
        try {
            List<UUID> assignedParkIds = technicianParkAssignmentRepository.findParkingLotIdsByTechnicianId(user.getId());
            int total = technicianRepository.countTotalSensors(assignedParkIds);
            int operational = technicianRepository.countOperationalSensors(assignedParkIds);
            double uptimePct = total > 0 ? Math.round(operational * 1000.0 / total) / 10.0 : 0.0;
            return new TechnicianProfileResponse(
                user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
                user.isNotificationsEnabled(),
                profileRepository.countAssignedTasks(authentikUserId),
                new SensorSummary(total, operational, uptimePct),
                technicianRepository.countFailuresToday(assignedParkIds));
        } catch (RuntimeException ex) {
            log.warn("Failed to load TECHNICAL profile stats for userId={} subject={}", user.getId(), authentikUserId, ex);
            return new TechnicianProfileResponse(
                user.getName(), user.getEmail(), user.getRole(), user.getPhotoUrl(),
                user.isNotificationsEnabled(),
                0L,
                new SensorSummary(0, 0, 0.0),
                0L);
        }
    }

    private User findAndSyncUser(String authentikUserId, String email) {
        log.debug("Finding user by authentikUserId: {}", authentikUserId);
        return userRepository.findByAuthentikUserId(authentikUserId)
            .or(() -> {
                log.info("User with authentikUserId={} not found. Trying sync by email={}...", authentikUserId, email);
                if (email == null || email.isBlank()) {
                    log.warn("Cannot sync user: email is missing in JWT");
                    return java.util.Optional.empty();
                }
                return userRepository.findByEmail(email)
                    .map(u -> {
                        log.info("Sincronização automática: Utilizador {} encontrado por email. A atualizar authentikUserId para {}", email, authentikUserId);
                        u.setAuthentikUserId(authentikUserId);
                        return userRepository.save(u);
                    });
            })
            .orElseThrow(() -> {
                log.error("Utilizador não encontrado no sistema: ID={} Email={}", authentikUserId, email);
                return new ResourceNotFoundException("Perfil de utilizador não encontrado. Por favor, complete o registo.");
            });
    }
}
