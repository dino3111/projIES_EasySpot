package pt.ua.deti.apieasyspot.ocr.repository;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.ocr.model.OcrPlateRead;

import java.sql.Timestamp;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Repository
@RequiredArgsConstructor
public class OcrPlateReadRepository {

    private final @Qualifier("timescaleJdbcTemplate") JdbcTemplate jdbc;
    private final ObjectMapper objectMapper;

    public void save(OcrPlateRead read) {
        jdbc.update(
            """
            insert into ocr_plate_reads
                (id, park_id, spot_id, plate, confidence, direction, occurred_at, extra)
            values
                (?::uuid, ?::uuid, ?::uuid, ?, ?, ?, ?, ?::jsonb)
            on conflict do nothing
            """,
            read.getId() != null ? read.getId().toString() : UUID.randomUUID().toString(),
            read.getParkId().toString(),
            read.getSpotId() != null ? read.getSpotId().toString() : null,
            read.getPlate(),
            read.getConfidence(),
            read.getDirection(),
            Timestamp.from(read.getOccurredAt()),
            toJson(read.getExtra())
        );
    }

    private String toJson(Map<String, Object> extra) {
        try {
            return objectMapper.writeValueAsString(extra != null ? extra : Map.of());
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("Unable to serialize OCR extra payload", exception);
        }
    }

    public List<Map<String, Object>> findRecentByPark(UUID parkId, int limit) {
        return jdbc.queryForList(
            """
            select id, park_id, spot_id, plate, confidence, direction, occurred_at
            from ocr_plate_reads
            where park_id = ?::uuid
            order by occurred_at desc
            limit ?
            """,
            parkId.toString(), limit
        );
    }
}
