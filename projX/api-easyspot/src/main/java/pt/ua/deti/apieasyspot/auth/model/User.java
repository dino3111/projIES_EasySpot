package pt.ua.deti.apieasyspot.auth.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(unique = true, nullable = false)
    private String authentikUserId;

    @Column(unique = true, nullable = false, length = 255)
    @Email @NotBlank
    private String email;

    @Column(nullable = false, length = 255)
    private String name;

    @Column()
    private String photoUrl; //integrate with cloudflare r2

    @Column(nullable = false, length = 20)
    private String role;

    @CreationTimestamp @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @CreationTimestamp @Column(nullable = false)
    private LocalDateTime updatedAt;

}
