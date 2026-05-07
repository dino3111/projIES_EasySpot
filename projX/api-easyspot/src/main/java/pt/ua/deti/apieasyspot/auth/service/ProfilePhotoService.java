package pt.ua.deti.apieasyspot.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;

import java.io.IOException;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ProfilePhotoService {
    private static final long MAX_PHOTO_BYTES = 5L * 1024 * 1024;
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final UserRepository userRepository;
    private final R2StorageService r2StorageService;

    public String upload(String authentikUserId, MultipartFile photo) {
        if (photo == null || photo.isEmpty()) throw new IllegalArgumentException("Photo file is required");
        if (photo.getSize() > MAX_PHOTO_BYTES) throw new IllegalArgumentException("Photo must not exceed 5 MB");
        String contentType = photo.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Photo format must be JPEG, PNG, or WEBP");
        }

        User user = userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));

        try {
            String extension = switch (contentType) {
                case "image/png" -> "png";
                case "image/webp" -> "webp";
                default -> "jpg";
            };
            String key = "profiles/" + user.getId() + "-" + System.currentTimeMillis() + "." + extension;
            String photoUrl = r2StorageService.upload(key, photo.getBytes(), contentType);
            user.setPhotoUrl(photoUrl);
            userRepository.save(user);
            return photoUrl;
        } catch (IOException ex) {
            throw new IllegalArgumentException("Unable to read uploaded photo");
        }
    }
}
