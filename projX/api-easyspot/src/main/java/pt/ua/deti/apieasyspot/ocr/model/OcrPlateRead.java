package pt.ua.deti.apieasyspot.ocr.model;

import lombok.Data;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Data
public class OcrPlateRead {

    private UUID id;
    private UUID parkId;
    private UUID spotId;
    private String plate;
    private Double confidence;
    private String direction;
    private String failureMode;
    private Instant occurredAt;
    private Map<String, Object> extra;
}
