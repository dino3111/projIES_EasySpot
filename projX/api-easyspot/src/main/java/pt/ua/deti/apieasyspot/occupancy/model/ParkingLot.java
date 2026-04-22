package pt.ua.deti.apieasyspot.occupancy.model;

import jakarta.persistence.*;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
@Entity
@Table(name = "parking_lots")
public class ParkingLot {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, length = 100)
    private String city;

    @Column(nullable = false, length = 255)
    private String address;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(length = 50)
    private String openingHours;

    @Column(nullable = false)
    private Integer totalSpaces;

    @ElementCollection
    @CollectionTable(name = "parking_lot_amenities", joinColumns = @JoinColumn(name = "parking_lot_id"))
    @Column(name = "amenity")
    private List<String> amenities;

}
