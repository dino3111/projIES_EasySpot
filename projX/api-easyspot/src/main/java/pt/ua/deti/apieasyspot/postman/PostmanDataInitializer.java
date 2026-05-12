package pt.ua.deti.apieasyspot.postman;

import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.model.ParkingSession;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.notification.model.Alert;
import pt.ua.deti.apieasyspot.notification.model.StateAlert;
import pt.ua.deti.apieasyspot.notification.model.SeverityAlert;
import pt.ua.deti.apieasyspot.notification.model.AlertType;
import pt.ua.deti.apieasyspot.notification.repository.TimescaleAlertRepository;
import pt.ua.deti.apieasyspot.occupancy.model.*;
import pt.ua.deti.apieasyspot.occupancy.repository.AccessibleSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.EVChargerRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TariffRepository;
import pt.ua.deti.apieasyspot.occupancy.repository.TimescaleOccupancySnapshotRepository;
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
@Slf4j
class PostmanDataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final ParkingLotRepository parkingLotRepository;
    private final TimescaleParkingSessionRepository parkingSessionRepository;
    private final TimescaleAlertRepository alertRepository;
    private final TimescaleOccupancySnapshotRepository occupancySnapshotRepository;
    private final TariffRepository tariffRepository;
    private final EVChargerRepository evChargerRepository;
    private final AccessibleSpotRepository accessibleSpotRepository;
    private final ParkingSpotRepository parkingSpotRepository;

    @Getter
    private UUID vehicleId;

    @Getter
    private UUID secondaryVehicleId;

    @Getter
    private UUID parkId;

    @Getter
    private UUID userId;

    @Getter
    private UUID technicianId;

    PostmanDataInitializer(
        UserRepository userRepository,
        VehicleRepository vehicleRepository,
        ParkingLotRepository parkingLotRepository,
        TimescaleParkingSessionRepository parkingSessionRepository,
        TimescaleAlertRepository alertRepository,
        TimescaleOccupancySnapshotRepository occupancySnapshotRepository,
        TariffRepository tariffRepository,
        EVChargerRepository evChargerRepository,
        AccessibleSpotRepository accessibleSpotRepository,
        ParkingSpotRepository parkingSpotRepository
    ) {
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.parkingLotRepository = parkingLotRepository;
        this.parkingSessionRepository = parkingSessionRepository;
        this.alertRepository = alertRepository;
        this.occupancySnapshotRepository = occupancySnapshotRepository;
        this.tariffRepository = tariffRepository;
        this.evChargerRepository = evChargerRepository;
        this.accessibleSpotRepository = accessibleSpotRepository;
        this.parkingSpotRepository = parkingSpotRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        User driver = seedUser();
        User technician = seedTechnician();
        List<ParkingLot> lots = seedLots();
        seedDetails(lots, technician);
        runBestEffort("timeseries parking sessions", () -> seedSessions(lots, driver));
        runBestEffort("timeseries alerts", () -> seedAlerts(lots));
        runBestEffort("timeseries occupancy snapshots", () -> seedHourlySnapshots(lots));
    }

    private void runBestEffort(String datasetName, Runnable seedAction) {
        try {
            seedAction.run();
        } catch (DataAccessException ex) {
            log.warn("Postman seed skipped for {}: {}", datasetName, ex.getMostSpecificCause().getMessage());
        }
    }

    private User seedUser() {
        User user = new User();
        user.setAuthentikUserId("auth-sub-postman-driver");
        user.setEmail("postman@easyspot.test");
        user.setName("Postman Driver");
        user.setRole("DRIVER");
        user = userRepository.save(user);
        userId = user.getId();

        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate("AA-00-AA");
        vehicle.setMake("Opel");
        vehicle.setModel("Corsa");
        vehicle.setFuelType("Gasolina");
        vehicle.setYear(2021);
        vehicleId = vehicleRepository.save(vehicle).getId();

        Vehicle secondary = new Vehicle();
        secondary.setUser(user);
        secondary.setPlate("BB-11-BB");
        secondary.setMake("Renault");
        secondary.setModel("Zoe");
        secondary.setFuelType("Elétrico");
        secondary.setYear(2022);
        secondary.setEv(true);
        secondaryVehicleId = vehicleRepository.save(secondary).getId();
        return user;
    }

    private User seedTechnician() {
        User technician = new User();
        technician.setAuthentikUserId("auth-sub-postman-tech");
        technician.setEmail("postman-tech@easyspot.test");
        technician.setName("Laura Farias");
        technician.setRole("TECHNICAL");
        technician = userRepository.save(technician);
        technicianId = technician.getId();
        return technician;
    }

    private List<ParkingLot> seedLots() {
        List<ParkingLot> lots = parkingLotRepository.saveAll(List.of(
            lot("Fórum Aveiro", "Aveiro", "R. do Batalhão de Caçadores 10, 3810-064 Aveiro", 40.6405, -8.6531, "08h00-00h00", 500, List.of("CCTV", "WC", "Elevador", "Acessível")),
            lot("Glicínias Plaza", "Aveiro", "R. D. Manuel Barbuda e Vasconcelos, 3810-498 Aveiro", 40.6275, -8.6441, "09h00-23h00", 2000, List.of("CCTV", "WC", "Restaurantes", "Lojas")),
            lot("Europa", "Leiria", "Av. Marquês de Pombal, 2410-152 Leiria", 39.7431, -8.8061, "24h", 300, List.of("Segurança 24h", "Coberto"))
        ));
        // Use the 24h lot for reservation contract tests so CI is not time-of-day dependent.
        parkId = lots.get(2).getId();
        return lots;
    }

    private void seedDetails(List<ParkingLot> lots, User technician) {
        for (ParkingLot lot : lots) {
            lot.setTechnician(technician);
            parkingLotRepository.save(lot);

            Tariff standard = new Tariff();
            standard.setParkingLot(lot);
            standard.setName("Standard");
            standard.setDescription("Tarifa normal de estacionamento");
            boolean reservationContractLot = "Europa".equals(lot.getName());
            standard.setPricePerHour(reservationContractLot ? BigDecimal.ZERO : BigDecimal.valueOf(1.20));
            standard.setMaxDaily(reservationContractLot ? BigDecimal.ZERO : BigDecimal.valueOf(12.00));
            standard.setMonthly(BigDecimal.valueOf(80.00));
            tariffRepository.save(standard);

            if (lot.getName().contains("Fórum")) {
                EVCharger charger = new EVCharger();
                charger.setParkingLot(lot);
                charger.setType("Type 2");
                charger.setSpeed("Rápida (22kW)");
                charger.setPricePerKwh(BigDecimal.valueOf(0.35));
                charger.setAvailable(true);
                evChargerRepository.save(charger);

                AccessibleSpot spot = new AccessibleSpot();
                spot.setParkingLot(lot);
                spot.setLocation("Piso 0, junto à entrada");
                spot.setAvailable(true);
                spot.setDistanceToEntranceMeters(15);
                spot.setBaySize("3.5m x 5.0m");
                accessibleSpotRepository.save(spot);
            }

            for (int r = 1; r <= 3; r++) {
                for (int c = 1; c <= 5; c++) {
                    ParkingSpot s = new ParkingSpot();
                    s.setParkingLot(lot);
                    s.setSpotNumber(lot.getName().charAt(0) + "" + r + c);
                    s.setZone(ZoneType.STANDARD);
                    s.setSpotRow(r);
                    s.setSpotCol(c);
                    s.setStatus(Math.random() > 0.3 ? "free" : "occupied");
                    parkingSpotRepository.save(s);
                }
            }
        }
    }

    private void seedSessions(List<ParkingLot> lots, User driver) {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (int daysAgo = 6; daysAgo >= 0; daysAgo--) {
            int count = 50 + (int) (Math.random() * 100);
            for (int i = 0; i < count; i++) {
                ParkingLot lot = lots.get(i % lots.size());
                OffsetDateTime entry = now.minusDays(daysAgo).withHour(7 + (i % 14)).withMinute(i % 60);
                double durationH = 0.5 + (Math.random() * 3.5);
                UUID chosenVehicleId = i % 2 == 0 ? vehicleId : secondaryVehicleId;
                parkingSessionRepository.save(session(lot, entry, durationH, driver.getId(), chosenVehicleId));
            }
        }
    }

    private void seedAlerts(List<ParkingLot> lots) {
        List.of(
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
        ).forEach(alertRepository::save);
    }

    private void seedHourlySnapshots(List<ParkingLot> lots) {
        Instant startOfDay = Instant.now().truncatedTo(ChronoUnit.DAYS);
        int[] occupancyByHour = {10, 15, 25, 42, 68, 75, 80, 85, 78, 72, 74, 82, 88, 76, 54, 35, 20, 12};

        for (int h = 0; h < occupancyByHour.length; h++) {
            Instant recordedAt = startOfDay.plus(h + 7, ChronoUnit.HOURS);
            int pct = occupancyByHour[h];
            for (ParkingLot lot : lots) {
                insertSnapshot(lot, ZoneType.STANDARD, pct, 200, recordedAt);
                insertSnapshot(lot, ZoneType.EV, Math.min(pct + 5, 100), 30, recordedAt);
                insertSnapshot(lot, ZoneType.ACCESSIBLE, Math.max(pct - 20, 0), 15, recordedAt);
                insertSnapshot(lot, ZoneType.RESERVED, pct + 10 > 100 ? 95 : pct + 10, 20, recordedAt);
            }
        }
    }

    private ParkingLot lot(String name, String city, String address, Double lat, Double lng, String hours, Integer total, List<String> amenities) {
        ParkingLot l = new ParkingLot();
        l.setName(name);
        l.setCity(city);
        l.setAddress(address);
        l.setLatitude(lat);
        l.setLongitude(lng);
        l.setOpeningHours(hours);
        l.setTotalSpaces(total);
        l.setAmenities(amenities);
        return l;
    }

    private ParkingSession session(ParkingLot lot, OffsetDateTime entry, double durationHours, UUID driverId, UUID chosenVehicleId) {
        ParkingSession s = new ParkingSession();
        s.setUserId(driverId);
        s.setParkingLotId(lot.getId());
        s.setVehicleId(chosenVehicleId);
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
        a.setParkingLotId(lot.getId());
        a.setParkingLotName(lot.getName());
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

    private void insertSnapshot(ParkingLot lot, ZoneType zone, int pct, int total, Instant at) {
        occupancySnapshotRepository.insert(
            UUID.randomUUID(),
            lot.getId(),
            zone,
            (int) Math.round(total * pct / 100.0),
            total,
            at
        );
    }
}
