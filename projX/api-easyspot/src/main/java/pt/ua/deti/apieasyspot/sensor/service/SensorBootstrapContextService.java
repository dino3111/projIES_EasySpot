package pt.ua.deti.apieasyspot.sensor.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.sensor.dto.SensorBootstrapContextDto;
import pt.ua.deti.apieasyspot.sensor.repository.SensorRegistryRepository;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class SensorBootstrapContextService {

    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSpotRepository parkingSpotRepository;
    private final SensorRegistryRepository sensorRegistryRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final ReservationRepository reservationRepository;

    @Transactional(readOnly = true)
    public SensorBootstrapContextDto snapshot() {
        var lots = parkingLotRepository.findAll();
        var spots = parkingSpotRepository.findAll();
        var sensors = sensorRegistryRepository.findAll();
        var users = userRepository.findAll();
        var vehicles = vehicleRepository.findAll();
        var activeReservations = reservationRepository.findAllActiveWithSpot();

        return new SensorBootstrapContextDto(
            1,
            OffsetDateTime.now(),
            lots.stream().map(l -> new SensorBootstrapContextDto.ParkItem(l.getId(), l.getName(), l.getCity())).toList(),
            spots.stream().map(s -> new SensorBootstrapContextDto.SpotItem(
                s.getId(), s.getParkingLot().getId(), s.getSpotNumber(), s.getZone().name(), s.getSpotRow(), s.getSpotCol(), s.getStatus()
            )).toList(),
            sensors.stream().map(s -> new SensorBootstrapContextDto.SensorItem(
                s.getSensorId(), s.getParkingLot().getId(), s.getZone(), s.getStatus().name()
            )).toList(),
            users.stream().map(u -> new SensorBootstrapContextDto.UserItem(
                u.getId(), u.getAuthentikUserId(), u.getRole()
            )).toList(),
            vehicles.stream().map(v -> new SensorBootstrapContextDto.VehicleItem(
                v.getId(), v.getUser().getId(), v.getPlate(), v.isEv(), v.isAccessible()
            )).toList(),
            activeReservations.stream().map(r -> new SensorBootstrapContextDto.ReservationItem(
                r.getId(),
                r.getUser().getId(),
                r.getParkingLot().getId(),
                r.getParkingSpot() != null ? r.getParkingSpot().getId() : null,
                r.getVehicle() != null ? r.getVehicle().getId() : null,
                r.getStatus().name(),
                r.getArrivalTime(),
                r.getDepartureTime()
            )).toList()
        );
    }
}
