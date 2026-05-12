package pt.ua.deti.apieasyspot.analytics.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;

import java.util.UUID;

@Data
@NoArgsConstructor
@Entity(name = "AnalyticsTechnicianParkAssignment")
@Table(
    name = "technician_park_assignments",
    uniqueConstraints = @UniqueConstraint(columnNames = {"technician_id", "parking_lot_id"})
)
public class TechnicianParkAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "technician_id", nullable = false)
    private UUID technicianId;

    @Column(name = "parking_lot_id", nullable = false)
    private UUID parkingLotId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parking_lot_id", insertable = false, updatable = false)
    private ParkingLot parkingLot;

    public TechnicianParkAssignment(UUID technicianId, ParkingLot parkingLot) {
        this.technicianId = technicianId;
        this.parkingLotId = parkingLot.getId();
        this.parkingLot = parkingLot;
    }
}
