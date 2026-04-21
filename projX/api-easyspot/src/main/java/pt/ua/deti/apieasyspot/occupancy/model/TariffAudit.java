package pt.ua.deti.apieasyspot.occupancy.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(name = "tariff_audit")
public class TariffAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private UUID tariffId;

    @Column(nullable = false)
    private UUID parkingLotId;

    @Column(precision = 10, scale = 2)
    private BigDecimal pricePerHour;

    @Column(precision = 10, scale = 2)
    private BigDecimal maxDaily;

    @Column(precision = 10, scale = 2)
    private BigDecimal monthly;

    @Column(precision = 10, scale = 2)
    private BigDecimal pricePerKwh;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private TariffStatus status;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime changedAt;

    @Column(nullable = false)
    private String changedBy;
}
