package pt.ua.deti.apieasyspot.auth.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ProfilePhotoServiceTest {

    @Mock UserRepository userRepository;
    @Mock R2StorageService r2StorageService;

    private ProfilePhotoService profilePhotoService;

    @BeforeEach
    void setUp() {
        profilePhotoService = new ProfilePhotoService(userRepository, r2StorageService);
    }

    @Test
    @DisplayName("upload - valid JPEG - stores photo URL on user")
    void upload_validJpeg_storesPhotoUrl() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setAuthentikUserId("sub");
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.of(user));
        when(r2StorageService.upload(startsWith("profiles/" + user.getId()), any(byte[].class), eq("image/jpeg")))
            .thenReturn("https://cdn.example/profiles/photo.jpg");

        MockMultipartFile file = new MockMultipartFile("photo", "avatar.jpg", "image/jpeg", new byte[]{1, 2, 3});
        String url = profilePhotoService.upload("sub", file);

        assertThat(url).isEqualTo("https://cdn.example/profiles/photo.jpg");
        verify(userRepository).save(argThat(u -> "https://cdn.example/profiles/photo.jpg".equals(u.getPhotoUrl())));
    }

    @Test
    @DisplayName("upload - unsupported content type - throws IllegalArgumentException")
    void upload_unsupportedType_throws() {
        MockMultipartFile file = new MockMultipartFile("photo", "avatar.gif", "image/gif", new byte[]{1});
        assertThatThrownBy(() -> profilePhotoService.upload("sub", file))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("JPEG, PNG, or WEBP");
    }

    @Test
    @DisplayName("upload - user not found - throws ResourceNotFoundException")
    void upload_userNotFound_throws() {
        when(userRepository.findByAuthentikUserId("sub")).thenReturn(Optional.empty());
        MockMultipartFile file = new MockMultipartFile("photo", "avatar.jpg", "image/jpeg", new byte[]{1});
        assertThatThrownBy(() -> profilePhotoService.upload("sub", file))
            .isInstanceOf(ResourceNotFoundException.class);
    }
}
