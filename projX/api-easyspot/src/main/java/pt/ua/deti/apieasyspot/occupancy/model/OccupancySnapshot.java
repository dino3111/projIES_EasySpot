package pt.ua.deti.apieasyspot.occupancy.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;
import java.util.UUID;


@Data
@Entity
@Table(
    name = "occupancy_snapshots",
    indexes = {
        @Index(name = "idx_occ_snapshots_lot_id", columnList = "parking_lot_id"),
        @Index(name = "idx_occ_snapshots_recorded_at", columnList = "recorded_at"),
        @Index(name = "idx_occ_snapshots_lot_zone_time", columnList = "parking_lot_id, zone_type, recorded_at DESC")
    }
)
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
