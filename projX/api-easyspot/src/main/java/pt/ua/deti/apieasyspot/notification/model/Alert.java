package pt.ua.deti.apieasyspot.notification.model;

import lombok.Data;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class Alert {

    private UUID id;
    private UUID parkingLotId;
    private String parkingLotName;
    private AlertType type;
    private SeverityAlert severity;
    private StateAlert state;
    private String zone;
    private String spotNumber;
    private String sensorId;
    private String plate;
    private String description;
    private String photoUrl;
    private String attributedTo;
    private String notes;
    private OffsetDateTime resolvedAt;
    private OffsetDateTime createdAt;

}
