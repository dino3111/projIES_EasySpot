package pt.ua.deti.apieasyspot.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.auth.dto.DriverTypeResponse;
import pt.ua.deti.apieasyspot.auth.model.DriverType;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;

@Service
@RequiredArgsConstructor
public class UserProfileService {
    private final UserRepository userRepository;

    @Transactional
    public DriverTypeResponse updateDriverType(String authentikUserId, DriverType driverType) {
        User user = findUser(authentikUserId);
        user.setDriverType(driverType);
        return toResponse(userRepository.save(user));
    }

    private User findUser(String authentikUserId) {
        return userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));
    }

    private DriverTypeResponse toResponse(User user) {
        return new DriverTypeResponse(user.getDriverType());
    }
}