package pt.ua.deti.apieasyspot.booking.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Entity
@Table(
    name = "reservations",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_reservations_user_idempotency", columnNames = {"user_id", "idempotency_key"})
    },
    indexes = {
        @Index(name = "idx_res_user_id", columnList = "user_id"),
        @Index(name = "idx_res_parking_lot_id", columnList = "parking_lot_id"),
        @Index(name = "idx_res_parking_spot_id", columnList = "parking_spot_id"),
        @Index(name = "idx_res_status", columnList = "status"),
        @Index(name = "idx_res_arrival_time", columnList = "arrival_time"),
        @Index(name = "idx_res_idempotency_key", columnList = "idempotency_key")
    }
)
public class Reservation {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_spot_id")
    private ParkingSpot parkingSpot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Column(nullable = false)
    private OffsetDateTime arrivalTime;

    @Column(nullable = false)
    private OffsetDateTime departureTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ReservationStatus status;

    // Spot is held for 30 min after arrivalTime; null once terminal (COMPLETED/CANCELLED/EXPIRED)
    @Column
    private OffsetDateTime lockedUntil;

    @Column(precision = 10, scale = 2)
    private BigDecimal estimatedCost;

    @Column(nullable = false, unique = true, length = 20)
    private String bookingCode;

    // Optional idempotency support: same key → return existing reservation
    @Column(length = 255)
    private String idempotencyKey;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Reservation that)) return false;
        return id != null && id.equals(that.id);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}
