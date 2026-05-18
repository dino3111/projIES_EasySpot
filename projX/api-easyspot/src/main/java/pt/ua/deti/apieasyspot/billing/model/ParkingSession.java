package pt.ua.deti.apieasyspot.billing.model;

import lombok.Data;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Data
public class ParkingSession {

    private UUID id;
    private UUID reservationId;
    private UUID userId;
    private UUID parkingLotId;
    private UUID vehicleId;
    private ZoneType zoneType;
    private OffsetDateTime entryTime;
    private OffsetDateTime exitTime;
    private BigDecimal revenueEuros;

}
