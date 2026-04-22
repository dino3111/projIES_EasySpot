package pt.ua.deti.apieasyspot.occupancy.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Data
@Entity
@Table(name = "parking_spots")
public class ParkingSpot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Column(nullable = false, length = 20)
    private String spotNumber;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ZoneType zone;

    @Column(nullable = false)
    private Integer spotRow;

    @Column(nullable = false)
    private Integer spotCol;

    @Column(nullable = false, length = 20)
    private String status; // e.g., "free", "occupied", "reserved", "ev", "accessible"
}
