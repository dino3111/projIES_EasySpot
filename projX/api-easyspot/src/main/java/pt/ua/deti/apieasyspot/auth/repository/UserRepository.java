package pt.ua.deti.apieasyspot.auth.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.auth.model.User;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByAuthentikUserId(String authentikUserId);
    Optional<User> findByAuthentikPk(String authentikPk);
    Optional<User> findByEmail(String email);
    List<User> findByRole(String role);

    interface TechnicianSummaryProjection {
        UUID getId();
        String getName();
        String getEmail();
    }

    List<TechnicianSummaryProjection> findByRoleOrderByNameAsc(String role);
}
