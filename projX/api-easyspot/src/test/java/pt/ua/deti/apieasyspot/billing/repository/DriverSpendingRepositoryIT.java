package pt.ua.deti.apieasyspot.billing.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class DriverSpendingRepositoryIT {

    @Autowired private DriverSpendingRepository repository;
    @Autowired private ParkingSessionRepository parkingSessionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private VehicleRepository vehicleRepository;
    @Autowired private ParkingLotRepository parkingLotRepository;

    private User driver;
    private Vehicle vehicleA;
    private Vehicle vehicleB;
    private ParkingLot lotA;
    private ParkingLot lotB;

    @BeforeEach
    void setUp() {
        parkingSessionRepository.deleteAll();
        vehicleRepository.deleteAll();
        userRepository.deleteAll();
        parkingLotRepository.deleteAll();

        driver = new User();
        driver.setAuthentikUserId("driver-spending-it");
        driver.setEmail("driver.spending@test.com");
        driver.setName("Driver Spending");
        driver.setRole("DRIVER");
        driver = userRepository.save(driver);

        vehicleA = vehicle("AA-00-AA", false);
        vehicleB = vehicle("BB-00-BB", true);
        vehicleA = vehicleRepository.save(vehicleA);
        vehicleB = vehicleRepository.save(vehicleB);

        lotA = parkingLot("Fórum Aveiro");
        lotB = parkingLot("Glicínias Plaza");
        lotA = parkingLotRepository.save(lotA);
        lotB = parkingLotRepository.save(lotB);
    }

    @Test
    @DisplayName("aggregation queries return correct totals and breakdowns")
    void aggregationQueries_returnExpectedNumbers() {
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusDays(2);
        parkingSessionRepository.saveAll(List.of(
            session(lotA, vehicleA, ZoneType.STANDARD, base.plusHours(1), 60, "5.00"),
            session(lotA, vehicleB, ZoneType.EV, base.plusHours(5), 90, "9.00"),
            session(lotB, vehicleA, ZoneType.STANDARD, base.plusHours(9), 120, "10.00")
        ));

        OffsetDateTime from = base.minusHours(1);
        OffsetDateTime to = base.plusDays(3);

        DriverSpendingRepository.TotalsRow totals = repository.totals(driver.getId(), null, from, to);
        assertThat(totals.totalSpent()).isEqualByComparingTo("24.00");
        assertThat(totals.parkingSpent()).isEqualByComparingTo("15.00");
        assertThat(totals.chargingSpent()).isEqualByComparingTo("9.00");
        assertThat(totals.sessions()).isEqualTo(3);

        var parks = repository.breakdownByPark(driver.getId(), null, from, to);
        assertThat(parks).hasSize(2);
        assertThat(parks.get(0).parkName()).isEqualTo("Fórum Aveiro");
        assertThat(parks.get(0).totalSpent()).isEqualByComparingTo("14.00");
        assertThat(parks.get(0).sessionCount()).isEqualTo(2);

        var vehicles = repository.breakdownByVehicle(driver.getId(), null, from, to);
        assertThat(vehicles).hasSize(2);
        assertThat(vehicles.stream().filter(v -> v.licensePlate().equals("AA-00-AA")).findFirst().orElseThrow().totalSpent())
            .isEqualByComparingTo("15.00");

        assertThat(repository.costliestSession(driver.getId(), null, from, to).totalSpent()).isEqualByComparingTo("10.00");
        assertThat(repository.history(driver.getId(), null, from, to, 0, 50)).hasSize(3);
    }

    @Test
    @DisplayName("aggregation filters by vehicleId")
    void aggregationQueries_filterByVehicle() {
        OffsetDateTime base = OffsetDateTime.now(ZoneOffset.UTC).minusDays(1);
        parkingSessionRepository.saveAll(List.of(
            session(lotA, vehicleA, ZoneType.STANDARD, base.plusHours(1), 60, "4.00"),
            session(lotB, vehicleB, ZoneType.EV, base.plusHours(3), 40, "6.00")
        ));

        OffsetDateTime from = base.minusHours(1);
        OffsetDateTime to = base.plusDays(1);

        DriverSpendingRepository.TotalsRow totals = repository.totals(driver.getId(), vehicleB.getId(), from, to);
        assertThat(totals.totalSpent()).isEqualByComparingTo("6.00");
        assertThat(repository.breakdownByVehicle(driver.getId(), vehicleB.getId(), from, to)).hasSize(1);
        assertThat(repository.breakdownByVehicle(driver.getId(), vehicleB.getId(), from, to).get(0).licensePlate()).isEqualTo("BB-00-BB");
    }

    private Vehicle vehicle(String plate, boolean ev) {
        Vehicle v = new Vehicle();
        v.setUser(driver);
        v.setPlate(plate);
        v.setMake("Make");
        v.setModel("Model");
        v.setYear(2022);
        v.setFuelType(ev ? "Elétrico" : "Gasolina");
        v.setEv(ev);
        return v;
    }

    private ParkingLot parkingLot(String name) {
        ParkingLot lot = new ParkingLot();
        lot.setName(name);
        lot.setCity("Aveiro");
        lot.setAddress("Rua X");
        lot.setLatitude(40.64);
        lot.setLongitude(-8.65);
        lot.setTotalSpaces(200);
        return lot;
    }

    private ParkingSession session(ParkingLot lot, Vehicle vehicle, ZoneType zoneType, OffsetDateTime entry, long durationMinutes, String revenue) {
        ParkingSession session = new ParkingSession();
        session.setUser(driver);
        session.setVehicle(vehicle);
        session.setParkingLot(lot);
        session.setZoneType(zoneType);
        session.setEntryTime(entry);
        session.setExitTime(entry.plusMinutes(durationMinutes));
        session.setRevenueEuros(new BigDecimal(revenue));
        return session;
    }
}
