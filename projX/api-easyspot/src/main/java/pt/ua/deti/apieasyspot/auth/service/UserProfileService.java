package pt.ua.deti.apieasyspot.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.auth.model.DriverType;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.model.UserRole;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.common.exception.ResourceNotFoundException;
import java.util.EnumSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserProfileService {
    private final UserRepository userRepository;

    @Transactional
    public User updateDriverType(String authentikUserId, DriverType driverType, Set<DriverType> driverTypes) {
        User user = findUser(authentikUserId);
        Set<DriverType> effectiveTypes = driverTypes != null && !driverTypes.isEmpty()
            ? EnumSet.copyOf(driverTypes)
            : EnumSet.of(driverType);
        user.setDriverType(driverType);
        user.setDriverTypes(effectiveTypes);
        return userRepository.save(user);
    }

    @Transactional
    public User updateRole(String authentikUserId, UserRole role) {
        User user = findUser(authentikUserId);
        user.setRole(role.name());
        return userRepository.save(user);
    }

    private User findUser(String authentikUserId) {
        return userRepository.findByAuthentikUserId(authentikUserId)
            .orElseThrow(() -> new ResourceNotFoundException("User not found: " + authentikUserId));
    }
}
