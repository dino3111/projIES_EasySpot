package pt.ua.deti.apieasyspot.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.analytics.repository.AnalyticsRepository;
import pt.ua.deti.apieasyspot.analytics.repository.TechnicianRepository;
import pt.ua.deti.apieasyspot.auth.dto.*;
import pt.ua.deti.apieasyspot.auth.model.DriverType;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.ProfileRepository;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.booking.repository.UserFavoriteRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

    @Mock UserRepository userRepository;
    @Mock ProfileRepository profileRepository;
    @Mock AnalyticsRepository analyticsRepository;
    @Mock TechnicianRepository technicianRepository;
    @Mock UserFavoriteRepository userFavoriteRepository;

    ProfileService profileService;

    @BeforeEach
    void setUp() {
        profileService = new ProfileService(
            userRepository, profileRepository,
            analyticsRepository, technicianRepository, userFavoriteRepository);
    }

    @Test
    @DisplayName("getProfile - DRIVER role - returns DriverProfileResponse")
    void getProfile_driver_returnsDriverResponse() {
        User user = buildUser("DRIVER");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(profileRepository.spendingSummary(user.getId()))
            .thenReturn(new SpendingSummary(BigDecimal.TEN, 2L, BigDecimal.valueOf(5)));
        when(userFavoriteRepository.countByUserId(user.getId())).thenReturn(3L);

        Object result = profileService.getProfile("sub", "DRIVER");

        assertThat(result).isInstanceOf(DriverProfileResponse.class);
        DriverProfileResponse r = (DriverProfileResponse) result;
        assertThat(r.email()).isEqualTo("test@test.com");
        assertThat(r.favoritesCount()).isEqualTo(3L);
    }

    @Test
    @DisplayName("getProfile - MANAGER role - returns ManagerProfileResponse")
    void getProfile_manager_returnsManagerResponse() {
        User user = buildUser("MANAGER");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(analyticsRepository.countActiveLots()).thenReturn(4);
        when(analyticsRepository.revenueToday()).thenReturn(BigDecimal.valueOf(500));
        when(analyticsRepository.countEntriesToday()).thenReturn(87L);
        when(analyticsRepository.countOpenAlerts()).thenReturn(2L);

        Object result = profileService.getProfile("sub", "MANAGER");

        assertThat(result).isInstanceOf(ManagerProfileResponse.class);
        ManagerProfileResponse r = (ManagerProfileResponse) result;
        assertThat(r.managedParks()).isEqualTo(4);
        assertThat(r.openAlerts()).isEqualTo(2L);
    }

    @Test
    @DisplayName("getProfile - TECHNICAL role - returns TechnicianProfileResponse")
    void getProfile_technician_returnsTechnicianResponse() {
        User user = buildUser("TECHNICAL");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(technicianRepository.countTotalSensors()).thenReturn(100);
        when(technicianRepository.countOperationalSensors()).thenReturn(90);
        when(technicianRepository.countFailuresToday()).thenReturn(5L);
        when(profileRepository.countAssignedTasks("sub")).thenReturn(2L);

        Object result = profileService.getProfile("sub", "TECHNICAL");

        assertThat(result).isInstanceOf(TechnicianProfileResponse.class);
        TechnicianProfileResponse r = (TechnicianProfileResponse) result;
        assertThat(r.assignedTasks()).isEqualTo(2L);
        assertThat(r.sensorSummary().uptimePct()).isEqualTo(90.0);
    }

    @Test
    @DisplayName("getProfile - unknown role - throws IllegalArgumentException")
    void getProfile_unknownRole_throwsIllegalArgument() {
        assertThatThrownBy(() -> profileService.getProfile("sub", "ADMIN"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unknown role");
        verify(userRepository, never()).findByAuthentikUserId(any());
    }

    @Test
    @DisplayName("updateProfile - unknown role - throws before persisting (EC-role-guard)")
    void updateProfile_unknownRole_doesNotPersist() {
        ProfileUpdateRequest request = new ProfileUpdateRequest(null, false, null, null, null);

        assertThatThrownBy(() -> profileService.updateProfile("sub", request, "UNKNOWN"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Unknown role");
        verify(userRepository, never()).save(any());
    }

    @Test
    @DisplayName("getProfile - user not found - throws ResourceNotFoundException")
    void getProfile_userNotFound_throwsResourceNotFound() {
        when(userRepository.findByAuthentikUserId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> profileService.getProfile("missing", "DRIVER"))
            .isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    @DisplayName("updateProfile - driverType allowed for DRIVER")
    void updateProfile_driverType_allowedForDriver() {
        User user = buildUser("DRIVER");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);
        when(profileRepository.spendingSummary(user.getId()))
            .thenReturn(new SpendingSummary(BigDecimal.ZERO, 0L, BigDecimal.ZERO));
        when(userFavoriteRepository.countByUserId(user.getId())).thenReturn(0L);

        ProfileUpdateRequest request = new ProfileUpdateRequest(DriverType.EV, null, null, null, null);
        Object result = profileService.updateProfile("sub", request, "DRIVER");

        assertThat(result).isInstanceOf(DriverProfileResponse.class);
        verify(userRepository).save(argThat(u -> u.getDriverType() == DriverType.EV));
    }

    @Test
    @DisplayName("updateProfile - driverType rejected for MANAGER (EC-11)")
    void updateProfile_driverType_rejectedForManager() {
        ProfileUpdateRequest request = new ProfileUpdateRequest(DriverType.EV, null, null, null, null);

        assertThatThrownBy(() -> profileService.updateProfile("sub", request, "MANAGER"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("driverType");
    }

    @Test
    @DisplayName("updateProfile - driverType rejected for TECHNICAL (EC-11)")
    void updateProfile_driverType_rejectedForTechnician() {
        ProfileUpdateRequest request = new ProfileUpdateRequest(DriverType.EV, null, null, null, null);

        assertThatThrownBy(() -> profileService.updateProfile("sub", request, "TECHNICAL"))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("driverType");
    }

    @Test
    @DisplayName("updateProfile - notificationsEnabled allowed for all roles")
    void updateProfile_notificationsEnabled_allowedForAllRoles() {
        User user = buildUser("MANAGER");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);
        when(analyticsRepository.countActiveLots()).thenReturn(1);
        when(analyticsRepository.revenueToday()).thenReturn(BigDecimal.ZERO);
        when(analyticsRepository.countEntriesToday()).thenReturn(0L);
        when(analyticsRepository.countOpenAlerts()).thenReturn(0L);

        ProfileUpdateRequest request = new ProfileUpdateRequest(null, false, null, null, null);
        profileService.updateProfile("sub", request, "MANAGER");

        verify(userRepository).save(argThat(u -> !u.isNotificationsEnabled()));
    }

    @Test
    @DisplayName("updateProfile - driver notification preferences persist independently")
    void updateProfile_driverNotificationPreferences_persistIndependently() {
        User user = buildUser("DRIVER");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);
        when(profileRepository.spendingSummary(user.getId()))
            .thenReturn(new SpendingSummary(BigDecimal.ZERO, 0L, BigDecimal.ZERO));
        when(userFavoriteRepository.countByUserId(user.getId())).thenReturn(0L);

        ProfileUpdateRequest request = new ProfileUpdateRequest(null, null, true, false, null);
        profileService.updateProfile("sub", request, "DRIVER");

        verify(userRepository).save(argThat(u ->
            u.isPushNotificationsEnabled() && !u.isEmailNotificationsEnabled() && u.isNotificationsEnabled()));
    }

    @Test
    @DisplayName("updateProfile - empty request is no-op (EC-3)")
    void updateProfile_emptyRequest_isNoop() {
        User user = buildUser("DRIVER");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);
        when(profileRepository.spendingSummary(user.getId()))
            .thenReturn(new SpendingSummary(BigDecimal.ZERO, 0L, BigDecimal.ZERO));
        when(userFavoriteRepository.countByUserId(user.getId())).thenReturn(0L);

        ProfileUpdateRequest request = new ProfileUpdateRequest(null, null, null, null, null);
        profileService.updateProfile("sub", request, "DRIVER");

        verify(userRepository).save(argThat(u ->
            u.getDriverType() == null && u.isNotificationsEnabled() && u.getPhotoUrl() == null));
    }

    @Test
    @DisplayName("updateProfile - photoUrl updated for any role")
    void updateProfile_photoUrl_updatedForAnyRole() {
        User user = buildUser("TECHNICAL");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(userRepository.save(any())).thenReturn(user);
        when(technicianRepository.countTotalSensors()).thenReturn(0);
        when(technicianRepository.countOperationalSensors()).thenReturn(0);
        when(technicianRepository.countFailuresToday()).thenReturn(0L);
        when(profileRepository.countAssignedTasks("sub")).thenReturn(0L);

        ProfileUpdateRequest request = new ProfileUpdateRequest(null, null, null, null, "https://example.com/photo.jpg");
        profileService.updateProfile("sub", request, "TECHNICAL");

        verify(userRepository).save(argThat(u -> "https://example.com/photo.jpg".equals(u.getPhotoUrl())));
    }

    private User buildUser(String role) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setAuthentikUserId("sub");
        user.setEmail("test@test.com");
        user.setName("Test User");
        user.setRole(role);
        user.setNotificationsEnabled(true);
        user.setPushNotificationsEnabled(true);
        user.setEmailNotificationsEnabled(false);
        return user;
    }
}
