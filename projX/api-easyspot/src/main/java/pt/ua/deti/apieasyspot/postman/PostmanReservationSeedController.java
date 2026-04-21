package pt.ua.deti.apieasyspot.postman;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.Tariff;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@Profile("postman")
@RequestMapping("/api/test/seed")
@RequiredArgsConstructor
class PostmanReservationSeedController {

    private static final String SEED_AUTHENTIK_ID = "postman-driver-seed";

    private final UserRepository userRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSpotRepository parkingSpotRepository;
    private final TariffRepository tariffRepository;
    private final VehicleRepository vehicleRepository;

    @GetMapping
    Map<String, String> seed() {
        User user = userRepository.findByAuthentikUserId(SEED_AUTHENTIK_ID)
            .orElseGet(() -> {
                User u = new User();
                u.setAuthentikUserId(SEED_AUTHENTIK_ID);
                u.setEmail("postman-driver@easyspot.test");
                u.setName("Postman Driver");
                u.setRole("DRIVER");
                return userRepository.save(u);
            });

        ParkingLot lot = parkingLotRepository.findAll().stream()
            .filter(l -> "Postman Seed Park".equals(l.getName()))
            .findFirst()
            .orElseGet(() -> {
                ParkingLot l = new ParkingLot();
                l.setName("Postman Seed Park");
                l.setCity("Aveiro");
                l.setAddress("Rua do Postman, 1");
                l.setLatitude(40.6405);
                l.setLongitude(-8.6538);
                l.setTotalSpaces(50);
                l.setOpeningHours("00:00-23:59");
                ParkingLot saved = parkingLotRepository.save(l);

                ParkingSpot spot = new ParkingSpot();
                spot.setParkingLot(saved);
                spot.setSpotNumber("P01");
                spot.setZone(ZoneType.STANDARD);
                spot.setSpotRow(1);
                spot.setSpotCol(1);
                spot.setStatus("free");
                parkingSpotRepository.save(spot);

                Tariff tariff = new Tariff();
                tariff.setParkingLot(saved);
                tariff.setName("Standard");
                tariff.setPricePerHour(new BigDecimal("1.50"));
                tariff.setMaxDaily(new BigDecimal("12.00"));
                tariffRepository.save(tariff);

                return saved;
            });

        Vehicle vehicle = vehicleRepository.findByUserId(user.getId()).stream().findFirst()
            .orElseGet(() -> {
                Vehicle v = new Vehicle();
                v.setUser(user);
                v.setPlate("PM-00-ST");
                v.setMake("Postman");
                v.setModel("Runner");
                v.setYear(2024);
                v.setFuelType("Electric");
                return vehicleRepository.save(v);
            });

        return Map.of(
            "parkId", lot.getId().toString(),
            "vehicleId", vehicle.getId().toString(),
            "userId", user.getId().toString()
        );
    }
}
