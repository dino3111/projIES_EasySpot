package pt.ua.deti.apieasyspot.vehicle.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.util.UUID;
import pt.ua.deti.apieasyspot.auth.model.User;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(
    name = "vehicles",
    uniqueConstraints = {
        @UniqueConstraint(columnNames = "plate"),
        @UniqueConstraint(columnNames = "vin")
    },
    indexes = {
        @Index(name = "idx_vehicles_user_id", columnList = "user_id")
    }
)
public class Vehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, unique = true, length = 10, name = "plate") @NotBlank
    private String plate;

    @Column(length = 17, unique = true)
    private String vin;

    @Column(nullable = false, length = 50) @NotBlank
    private String make;

    @Column(nullable = false, length = 80) @NotBlank
    private String model;

    @Column(length = 80)
    private String version;

    @Column(length = 50)
    private String color;

    @Column(nullable = false) @Min(1900) @Max(2100)
    private int year;

    @Column
    private Integer yearTo;

    @Column(nullable = false, length = 30) @NotBlank
    private String fuelType;

    @Column @Positive
    private Double powerKW;

    @Column @Positive
    private Double powerCV;

    @Column @Positive
    private Integer displacementCc;

    @Column @Positive
    private Integer cylinders;

    @Column(length = 80)
    private String bodyType;

    @Column(length = 80)
    private String driveType;

    @Column(length = 120)
    private String engineCode;

    @Column(length = 80)
    private String engineType;

    @Column(length = 500)
    private String imageUrl;

    @Column(length = 500)
    private String brandLogoUrl;

    @Column(length = 80)
    private String externalSourceId;

    @Column(length = 50)
    private String nickname;

    @Column(nullable = false, columnDefinition="BOOLEAN DEFAULT false")
    private boolean isEv;

    @Column(nullable = false, columnDefinition="BOOLEAN DEFAULT false")
    private boolean isAccessible;

    @Column(nullable = false, columnDefinition="BOOLEAN DEFAULT false")
    private boolean isPrimary;

    @Column(columnDefinition = "TEXT") @Size(max = 1000)
    private String chargerTypesJson;

    @Column
    private LocalDateTime lastSyncedAt;

    @Column(columnDefinition = "TEXT")
    private String syncedDataJson;

    @CreationTimestamp @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp @Column(nullable = false)
    private LocalDateTime updatedAt;
}
