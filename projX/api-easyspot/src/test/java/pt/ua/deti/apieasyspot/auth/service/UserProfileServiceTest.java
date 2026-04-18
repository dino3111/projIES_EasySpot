package pt.ua.deti.apieasyspot.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.model.UserRole;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserProfileServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserProfileService service;

    private User user;

    @BeforeEach
    void setUp() {
        user = new User();
        user.setId(UUID.randomUUID());
        user.setAuthentikUserId("sub-123");
        user.setEmail("test@test.com");
        user.setName("Test User");
        user.setRole("DRIVER");
    }

    @Test
    @DisplayName("updateRole - user not found - throws ResourceNotFoundException")
    void updateRole_userNotFound_throws() {
        when(userRepository.findByAuthentikUserId("missing")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateRole("missing", UserRole.MANAGER))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessageContaining("missing");

        verify(userRepository, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(UserRole.class)
    @DisplayName("updateRole - all valid roles - persists and returns user")
    void updateRole_allValidRoles_persistsCorrectly(UserRole role) {
        when(userRepository.findByAuthentikUserId("sub-123")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        User result = service.updateRole("sub-123", role);

        assertThat(result.getRole()).isEqualTo(role.name());
        verify(userRepository).save(user);
    }

    @Test
    @DisplayName("updateRole - DRIVER to MANAGER - persists new role")
    void updateRole_driverToManager_updatesRole() {
        when(userRepository.findByAuthentikUserId("sub-123")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        User result = service.updateRole("sub-123", UserRole.MANAGER);

        assertThat(result.getRole()).isEqualTo("MANAGER");
    }

    @Test
    @DisplayName("updateRole - same role twice - idempotent, still saves")
    void updateRole_sameRole_idempotent() {
        when(userRepository.findByAuthentikUserId("sub-123")).thenReturn(Optional.of(user));
        when(userRepository.save(user)).thenReturn(user);

        service.updateRole("sub-123", UserRole.DRIVER);
        service.updateRole("sub-123", UserRole.DRIVER);

        verify(userRepository, times(2)).save(user);
        assertThat(user.getRole()).isEqualTo("DRIVER");
    }
}
