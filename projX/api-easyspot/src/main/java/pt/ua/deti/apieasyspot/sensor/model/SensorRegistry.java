package pt.ua.deti.apieasyspot.sensor.model;

import jakarta.persistence.*;
import lombok.Data;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;

import java.time.LocalDateTime;

@Data
@Entity
@Table(
    name = "sensor_registry",
    indexes = {
        @Index(name = "idx_sr_parking_lot_id", columnList = "parking_lot_id"),
        @Index(name = "idx_sr_status", columnList = "status")
    }
)
public class SensorRegistry {

    @Id
    @Column(name = "sensor_id", length = 50)
    private String sensorId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Column(length = 100)
    private String zone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SensorStatus status;

    @Column(nullable = false)
    private LocalDateTime lastSeenAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;
}
