package pt.ua.deti.apieasyspot.booking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReservationLifecycleService {

    private final ReservationRepository reservationRepository;
    private final ParkingSpotRepository parkingSpotRepository;

    @Scheduled(cron = "${reservations.lifecycle.cron:0 * * * * *}")
    @Transactional
    public void reconcileLifecycle() {
        reconcileLifecycle(OffsetDateTime.now(ZoneOffset.UTC));
    }

    @Transactional
    public int reconcileLifecycle(OffsetDateTime now) {
        int changedReservations = reservationRepository.expireTimedOutLocks(
            now, ReservationStatus.CONFIRMED, ReservationStatus.EXPIRED);

        List<Reservation> activeReservations = reservationRepository.findAllActiveWithSpot();
        UpdateReservationsResult result = updateReservations(activeReservations, now);
        changedReservations += result.changedCount();

        if (!activeReservations.isEmpty()) {
            reservationRepository.saveAll(activeReservations);
        }

        int changedSpots = updateSpotStatuses(result.reservationBySpot(), now);

        if (changedReservations > 0 || changedSpots > 0) {
            log.debug(
                "Reconciled reservation lifecycle at {} (reservationsChanged={}, spotsChanged={})",
                now,
                changedReservations,
                changedSpots
            );
        }

        return changedReservations + changedSpots;
    }

    private UpdateReservationsResult updateReservations(List<Reservation> activeReservations, OffsetDateTime now) {
        Map<UUID, Reservation> reservationBySpot = new HashMap<>();
        int changedCount = 0;

        for (Reservation reservation : activeReservations) {
            ParkingSpot spot = reservation.getParkingSpot();
            if (spot == null) {
                continue;
            }

            if (updateSingleReservationStatus(reservation, now)) {
                changedCount++;
            }

            // Skip terminal reservations so they don't shadow future ones in the map.
            if (reservation.getStatus() == ReservationStatus.COMPLETED) {
                continue;
            }

            Reservation previous = reservationBySpot.get(spot.getId());
            if (previous == null || reservation.getArrivalTime().isBefore(previous.getArrivalTime())) {
                reservationBySpot.put(spot.getId(), reservation);
            }
        }
        return new UpdateReservationsResult(reservationBySpot, changedCount);
    }

    private boolean updateSingleReservationStatus(Reservation reservation, OffsetDateTime now) {
        if (now.isAfter(reservation.getDepartureTime()) && reservation.getStatus() == ReservationStatus.CONFIRMED) {
            reservation.setStatus(ReservationStatus.COMPLETED);
            reservation.setLockedUntil(null);
            return true;
        } else if (now.isAfter(reservation.getArrivalTime()) && now.isBefore(reservation.getDepartureTime())) {
            // The reservation is active; keep the booking lifecycle coherent.
            reservation.setStatus(ReservationStatus.CONFIRMED);
        }
        return false;
    }

    private record UpdateReservationsResult(Map<UUID, Reservation> reservationBySpot, int changedCount) {}

    private int updateSpotStatuses(Map<UUID, Reservation> reservationBySpot, OffsetDateTime now) {
        List<ParkingSpot> spots = parkingSpotRepository.findAll();
        int changedSpots = 0;
        for (ParkingSpot spot : spots) {
            String desiredStatus = deriveSpotStatus(spot, reservationBySpot.get(spot.getId()), now);
            if (!desiredStatus.equalsIgnoreCase(spot.getStatus())) {
                spot.setStatus(desiredStatus);
                changedSpots++;
            }
        }

        if (changedSpots > 0) {
            parkingSpotRepository.saveAll(spots);
        }
        return changedSpots;
    }

    private String deriveSpotStatus(ParkingSpot spot, Reservation reservation, OffsetDateTime now) {
        if (reservation == null || now.isAfter(reservation.getDepartureTime())) {
            return restoreTypeStatus(spot.getStatus());
        }
        if (now.isBefore(reservation.getArrivalTime())) {
            return "reserved";
        }
        return "occupied";
    }

    private String restoreTypeStatus(String currentStatus) {
        if (currentStatus == null) return "free";
        String s = currentStatus.trim().toLowerCase();
        return (s.equals("ev") || s.equals("accessible")) ? s : "free";
    }
}
