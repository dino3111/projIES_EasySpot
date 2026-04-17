package pt.ua.deti.apieasyspot.booking.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(
    name = "user_favorites",
    uniqueConstraints =  @UniqueConstraint(columnNames = {"user_id", "parking_lot_id"})
)
public class UserFavorite{

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

}
