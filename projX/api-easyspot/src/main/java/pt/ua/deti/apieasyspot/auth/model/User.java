package pt.ua.deti.apieasyspot.auth.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    @NotBlank
    private String authentikUserId;

    @Column(unique = true, nullable = false, length = 255)
    @Email @NotBlank
    private String email;

    @Column(nullable = false, length = 255)
    @NotBlank
    private String name;

    @Column
    private String photoUrl;

    @Column(nullable = false, length = 20)
    @NotBlank
    private String role;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private DriverType driverType;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean notificationsEnabled = true;

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Vehicle> vehicles = new ArrayList<>();

    @CreationTimestamp @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp @Column(nullable = false)
    private LocalDateTime updatedAt;

}
