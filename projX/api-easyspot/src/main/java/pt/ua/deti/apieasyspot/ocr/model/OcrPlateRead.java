package pt.ua.deti.apieasyspot.ocr.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
@Entity
@Table(name = "ocr_plate_reads")
public class OcrPlateRead {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "park_id", nullable = false)
    private UUID parkId;

    @Column(name = "spot_id")
    private UUID spotId;

    @Column(nullable = false, length = 20)
    private String plate;

    @Column(nullable = false)
    private Double confidence;

    @Column(nullable = false, length = 10)
    private String direction; // "entry" | "exit"

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> extra;
}
