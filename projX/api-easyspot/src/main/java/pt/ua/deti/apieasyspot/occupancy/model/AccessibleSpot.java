package pt.ua.deti.apieasyspot.occupancy.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.UUID;

@Data
@Entity
@Table(name = "accessible_spots")
public class AccessibleSpot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "parking_lot_id", insertable = false, updatable = false)
    private UUID parkingLotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", nullable = false)
    private ParkingLot parkingLot;

    @Column(nullable = false, length = 100)
    private String location;

    @Column(nullable = false)
    private boolean available;

    @Column(nullable = false)
    private Integer distanceToEntranceMeters;

    @Column(length = 50)
    private String baySize;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean monitored;

    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean hasRampSpace;

    @Column(length = 20, columnDefinition = "varchar(20) default 'online'")
    private String sensorStatus = "online";

    @Column(length = 10, columnDefinition = "varchar(10) default 'green'")
    private String ledStatus = "green";
}
