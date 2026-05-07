package pt.ua.deti.apieasyspot.occupancy.model;

import lombok.Data;

import java.time.Instant;
import java.util.UUID;

@Data
public class OccupancySnapshot {

    private UUID id;
    private UUID parkingLotId;
    private ZoneType zoneType;
    private int occupiedCount;
    private int totalCount;
    private Instant recordedAt;

}
