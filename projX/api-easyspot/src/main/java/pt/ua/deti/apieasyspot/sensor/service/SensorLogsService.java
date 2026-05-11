package pt.ua.deti.apieasyspot.sensor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.sensor.dto.SensorDetailDto;
import pt.ua.deti.apieasyspot.sensor.dto.SensorLogEntry;
import pt.ua.deti.apieasyspot.sensor.dto.SensorSummaryDto;
import pt.ua.deti.apieasyspot.sensor.model.SensorRegistry;
import pt.ua.deti.apieasyspot.sensor.repository.SensorLogsRepository;
import pt.ua.deti.apieasyspot.sensor.repository.SensorRegistryRepository;

import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SensorLogsService {

    private final SensorLogsRepository sensorLogsRepository;
    private final SensorRegistryRepository sensorRegistryRepository;

    public List<SensorSummaryDto> listAllSensors() {
        return sensorLogsRepository.findAllSensors();
    }

    public SensorDetailDto getSensorDetail(String sensorId) {
        SensorRegistry sensor = sensorRegistryRepository.findById(sensorId)
            .orElseThrow(() -> new SensorNotFoundException(sensorId));


        List<SensorLogEntry> logs = sensorLogsRepository.findLogsBySensorId(sensorId);

        return new SensorDetailDto(
            sensor.getSensorId(),
            sensor.getParkingLot().getId(),
            sensor.getParkingLot().getName(),
            sensor.getParkingLot().getCity(),
            sensor.getZone(),
            sensor.getStatus().name().toLowerCase(),
            sensor.getLastSeenAt().atOffset(ZoneOffset.UTC),
            sensor.getCreatedAt().atOffset(ZoneOffset.UTC),
            logs
        );
    }
}
