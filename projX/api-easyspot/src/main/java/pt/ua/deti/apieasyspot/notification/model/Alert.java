package pt.ua.deti.apieasyspot.notification.model;

import jakarta.persistence.*;
import lombok.Data;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;

import java.time.LocalDateTime;
import java.util.UUID;


@Data
@Entity
@Table(
    name = "alerts",
    indexes = {
        @Index(name = "idx_alerts_parking_lot_id", columnList = "parking_lot_id"),
        @Index(name = "idx_alerts_state", columnList = "state"),
        @Index(name = "idx_alerts_type_state", columnList = "type, state"),
        @Index(name = "idx_alerts_created_at", columnList = "created_at"),
        @Index(name = "idx_alerts_attributed_to", columnList = "attributed_to"),
        @Index(name = "idx_alerts_sensor_id", columnList = "sensor_id")
    }
)
public class Alert {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AlertType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SeverityAlert severity;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StateAlert state;

    @Column(length = 100)
    private String zone;

    @Column(length = 20)
    private String spotNumber;

    @Column(length = 30)
    private String sensorId;

    @Column(length = 20)
    private String plate;

    @Column(nullable = false, length = 500)
    private String description;

    @Column(length = 500)
    private String photoUrl;

    @Column(length = 100)
    private String attributedTo;

    @Column(length = 500)
    private String notes;

    @Column
    private LocalDateTime resolvedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

}
