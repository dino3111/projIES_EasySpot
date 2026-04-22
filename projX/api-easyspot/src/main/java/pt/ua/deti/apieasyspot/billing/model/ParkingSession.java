package pt.ua.deti.apieasyspot.billing.model;

import jakarta.persistence.*;
import lombok.Data;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;


@Data
@Entity
@Table(
    name = "parking_sessions",
    indexes = {
        @Index(name = "idx_ps_user_id", columnList = "user_id"),
        @Index(name = "idx_ps_vehicle_id", columnList = "vehicle_id"),
        @Index(name = "idx_ps_parking_lot_id", columnList = "parking_lot_id"),
        @Index(name = "idx_ps_entry_time", columnList = "entry_time"),
        @Index(name = "idx_ps_exit_time", columnList = "exit_time")
    }
)
public class ParkingSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "vehicle_id")
    private Vehicle vehicle;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ZoneType zoneType;

    @Column(nullable = false)
    private OffsetDateTime entryTime;

    @Column(nullable = false)
    private OffsetDateTime exitTime;

    @Column(precision = 8, scale = 2)
    private BigDecimal revenueEuros;

}
