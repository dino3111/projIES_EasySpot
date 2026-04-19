package pt.ua.deti.apieasyspot.occupancy.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
@Entity
@Table(name = "occupancy_snapshots")
public class OccupancySnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ZoneType zoneType;

    @Column(nullable = false)
    private int occupiedCount;

    @Column(nullable = false)
    private int totalCount;

    @Column(nullable = false)
    private Instant recordedAt;

}
