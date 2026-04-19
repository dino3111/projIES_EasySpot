package pt.ua.deti.apieasyspot.postman;

import lombok.Getter;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.billing.repository.ParkingSessionRepository;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.repository.AlertRepository;
import pt.ua.deti.apieasyspot.occupancy.model.OccupancySnapshot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.OccupancySnapshotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Component
@Profile("postman")
@Order(2)
class PostmanDataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final ParkingSessionRepository parkingSessionRepository;
    private final AlertRepository alertRepository;
    private final OccupancySnapshotRepository occupancySnapshotRepository;

    @Getter
    private UUID vehicleId;

    @Getter
    private UUID parkId;

    PostmanDataInitializer(
        UserRepository userRepository,
        VehicleRepository vehicleRepository,
        ParkingLotRepository parkingLotRepository,
        ParkingSessionRepository parkingSessionRepository,
        AlertRepository alertRepository,
        OccupancySnapshotRepository occupancySnapshotRepository
    ) {
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.parkingSessionRepository = parkingSessionRepository;
        this.alertRepository = alertRepository;
        this.occupancySnapshotRepository = occupancySnapshotRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        User driver = seedUser();
        List<ParkingLot> lots = seedLots();
        seedSessions(lots, driver);
        seedAlerts(lots);
        seedHourlySnapshots(lots);
    }

    private User seedUser() {
        User user = new User();
        user.setAuthentikUserId("auth-sub-postman-driver");
        user.setEmail("postman@easyspot.test");
        user.setName("Postman Driver");
        user.setRole("DRIVER");
        user = userRepository.save(user);

        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate("AA-00-AA");
        vehicle.setMake("Opel");
        vehicle.setModel("Corsa");
        vehicle.setFuelType("Gasolina");
        vehicle.setYear(2021);
        vehicleId = vehicleRepository.save(vehicle).getId();
        return user;
    }

    private List<ParkingLot> seedLots() {
        List<ParkingLot> lots = parkingLotRepository.saveAll(List.of(
            lot("Fórum Aveiro", "Aveiro"),
            lot("Glicínias Plaza", "Aveiro"),
            lot("Europa", "Leiria")
        ));
        parkId = lots.get(0).getId();
        return lots;
    }

    private void seedSessions(List<ParkingLot> lots, User driver) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (int daysAgo = 6; daysAgo >= 0; daysAgo--) {
            int count = 50 + (int) (Math.random() * 100);
            for (int i = 0; i < count; i++) {
                ParkingLot lot = lots.get(i % lots.size());
                OffsetDateTime entry = now.minusDays(daysAgo).withHour(7 + (i % 14)).withMinute(i % 60);
                double durationH = 0.5 + (Math.random() * 3.5);
                parkingSessionRepository.save(session(lot, entry, durationH, driver));
            }
        }
    }

    private void seedAlerts(List<ParkingLot> lots) {
        alertRepository.saveAll(List.of(
            alert(lots.get(0), AlertType.SENSOR, SeverityAlert.CRITICAL, StateAlert.OPEN,
                "Piso 0 – Zona B", "IR-AV1-B07", null,
                "Sensor infravermelho sem leituras há 2h", null, null,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(3)),
            alert(lots.get(1), AlertType.CLIENT, SeverityAlert.WARNING, StateAlert.IN_PROGRESS,
                "Piso -1", null, "55-AB-23",
                "Cobrança incorreta reportada pelo condutor", "Suporte EasySpot",
                "A verificar logs de entrada/saída.", OffsetDateTime.now(ZoneOffset.UTC).minusHours(1)),
            alert(lots.get(2), AlertType.SYSTEM, SeverityAlert.CRITICAL, StateAlert.IN_PROGRESS,
                null, null, null,
                "Leitor RFID sem comunicação desde as 06h45", "Laura Farias",
                "Técnico a caminho.", OffsetDateTime.now(ZoneOffset.UTC).minusHours(5)),
            alert(lots.get(0), AlertType.SENSOR, SeverityAlert.WARNING, StateAlert.OPEN,
                "Piso 0 – Zona A", "IR-AV1-A12", null,
                "Falha intermitente no sensor A12 (34% falsos-positivos)", null, null,
                OffsetDateTime.now(ZoneOffset.UTC).minusHours(6)),
            alert(lots.get(1), AlertType.CLIENT, SeverityAlert.INFO, StateAlert.RESOLVED,
                null, null, "73-CD-98",
                "Lugar EV reservado estava ocupado por veículo convencional",
                "Suporte EasySpot", "Reembolso processado.", OffsetDateTime.now(ZoneOffset.UTC).minusDays(1))
        ));
    }

    private void seedHourlySnapshots(List<ParkingLot> lots) {
        Instant startOfDay = Instant.now().truncatedTo(ChronoUnit.DAYS);
        int[] occupancyByHour = {10, 15, 25, 42, 68, 75, 80, 85, 78, 72, 74, 82, 88, 76, 54, 35, 20, 12};

        for (int h = 0; h < occupancyByHour.length; h++) {
            Instant recordedAt = startOfDay.plus(h + 7, ChronoUnit.HOURS);
            int pct = occupancyByHour[h];
            for (ParkingLot lot : lots) {
                occupancySnapshotRepository.save(snapshot(lot, ZoneType.STANDARD, pct, 200, recordedAt));
                occupancySnapshotRepository.save(snapshot(lot, ZoneType.EV, Math.min(pct + 5, 100), 30, recordedAt));
                occupancySnapshotRepository.save(snapshot(lot, ZoneType.ACCESSIBLE, Math.max(pct - 20, 0), 15, recordedAt));
                occupancySnapshotRepository.save(snapshot(lot, ZoneType.RESERVED, pct + 10 > 100 ? 95 : pct + 10, 20, recordedAt));
            }
        }
    }

    private ParkingLot lot(String name, String city) {
        ParkingLot l = new ParkingLot();
        l.setName(name);
        l.setCity(city);
        return l;
    }

    private ParkingSession session(ParkingLot lot, OffsetDateTime entry, double durationHours, User driver) {
        ParkingSession s = new ParkingSession();
        s.setUser(driver);
        s.setParkingLot(lot);
        s.setZoneType(ZoneType.STANDARD);
        s.setEntryTime(entry);
        s.setExitTime(entry.plusMinutes((long) (durationHours * 60)));
        s.setRevenueEuros(BigDecimal.valueOf(Math.round(durationHours * 1.5 * 100.0) / 100.0));
        return s;
    }

    private Alert alert(ParkingLot lot, AlertType tipo, SeverityAlert severidade,
                        StateAlert estado, String zona, String sensorId, String matricula,
                        String descricao, String atribuidoA, String notas, OffsetDateTime criadoEm) {
        Alert a = new Alert();
        a.setParkingLot(lot);
        a.setType(tipo);
        a.setSeverity(severidade);
        a.setState(estado);
        a.setZone(zona);
        a.setSensorId(sensorId);
        a.setPlate(matricula);
        a.setDescription(descricao);
        a.setAttributedTo(atribuidoA);
        a.setNotes(notas);
        a.setCreatedAt(criadoEm);
        return a;
    }

    private OccupancySnapshot snapshot(ParkingLot lot, ZoneType zone, int pct, int total, Instant at) {
        OccupancySnapshot s = new OccupancySnapshot();
        s.setParkingLot(lot);
        s.setZoneType(zone);
        s.setTotalCount(total);
        s.setOccupiedCount((int) Math.round(total * pct / 100.0));
        s.setRecordedAt(at);
        return s;
    }
}
