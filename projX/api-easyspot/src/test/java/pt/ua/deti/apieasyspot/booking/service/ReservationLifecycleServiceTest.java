package pt.ua.deti.apieasyspot.booking.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;
import pt.ua.deti.apieasyspot.booking.repository.ReservationRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingSpotRepository;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReservationLifecycleServiceTest {

    @Mock
    private ReservationRepository reservationRepository;

    @Mock
    private ParkingSpotRepository parkingSpotRepository;

    @InjectMocks
    private ReservationLifecycleService lifecycleService;

    @Test
    void reconcileLifecycle_completesEndedReservationAndFreesSpot() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        ParkingLot lot = new ParkingLot();
        lot.setId(UUID.randomUUID());

        ParkingSpot spot = new ParkingSpot();
        spot.setId(UUID.randomUUID());
        spot.setParkingLot(lot);
        spot.setSpotNumber("A1");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(1);
        spot.setSpotCol(1);
        spot.setStatus("occupied");

        Reservation reservation = new Reservation();
        reservation.setId(UUID.randomUUID());
        reservation.setParkingLot(lot);
        reservation.setParkingSpot(spot);
        reservation.setArrivalTime(now.minusHours(2));
        reservation.setDepartureTime(now.minusHours(1));
        reservation.setStatus(ReservationStatus.CONFIRMED);

        when(reservationRepository.expireTimedOutLocks(any(), eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED)))
            .thenReturn(0);
        when(reservationRepository.findAllActiveWithSpot()).thenReturn(List.of(reservation));
        when(parkingSpotRepository.findAll()).thenReturn(List.of(spot));

        int changed = lifecycleService.reconcileLifecycle(now);

        assertThat(changed).isGreaterThanOrEqualTo(1);
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.COMPLETED);
        assertThat(reservation.getLockedUntil()).isNull();
        assertThat(spot.getStatus()).isEqualTo("free");
        verify(reservationRepository).saveAll(List.of(reservation));
        verify(parkingSpotRepository).saveAll(List.of(spot));
    }

    @Test
    void reconcileLifecycle_marksFutureReservationAsReserved() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        ParkingLot lot = new ParkingLot();
        lot.setId(UUID.randomUUID());

        ParkingSpot spot = new ParkingSpot();
        spot.setId(UUID.randomUUID());
        spot.setParkingLot(lot);
        spot.setSpotNumber("A2");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(1);
        spot.setSpotCol(2);
        spot.setStatus("free");

        Reservation reservation = new Reservation();
        reservation.setId(UUID.randomUUID());
        reservation.setParkingLot(lot);
        reservation.setParkingSpot(spot);
        reservation.setArrivalTime(now.plusMinutes(45));
        reservation.setDepartureTime(now.plusHours(2));
        reservation.setStatus(ReservationStatus.CONFIRMED);

        when(reservationRepository.expireTimedOutLocks(any(), eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED)))
            .thenReturn(0);
        when(reservationRepository.findAllActiveWithSpot()).thenReturn(List.of(reservation));
        when(parkingSpotRepository.findAll()).thenReturn(List.of(spot));

        int changed = lifecycleService.reconcileLifecycle(now);

        assertThat(changed).isEqualTo(1);
        assertThat(reservation.getStatus()).isEqualTo(ReservationStatus.CONFIRMED);
        assertThat(spot.getStatus()).isEqualTo("reserved");
    }

    @Test
    void reconcileLifecycle_doesNotPersistReservationsWhenNothingChanged() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        ParkingLot lot = new ParkingLot();
        lot.setId(UUID.randomUUID());

        ParkingSpot spot = new ParkingSpot();
        spot.setId(UUID.randomUUID());
        spot.setParkingLot(lot);
        spot.setSpotNumber("A3");
        spot.setZone(ZoneType.STANDARD);
        spot.setSpotRow(1);
        spot.setSpotCol(3);
        spot.setStatus("occupied");

        Reservation reservation = new Reservation();
        reservation.setId(UUID.randomUUID());
        reservation.setParkingLot(lot);
        reservation.setParkingSpot(spot);
        reservation.setArrivalTime(now.minusMinutes(10));
        reservation.setDepartureTime(now.plusMinutes(10));
        reservation.setStatus(ReservationStatus.CONFIRMED);

        when(reservationRepository.expireTimedOutLocks(any(), eq(ReservationStatus.CONFIRMED), eq(ReservationStatus.EXPIRED)))
            .thenReturn(0);
        when(reservationRepository.findAllActiveWithSpot()).thenReturn(List.of(reservation));
        when(parkingSpotRepository.findAll()).thenReturn(List.of(spot));

        int changed = lifecycleService.reconcileLifecycle(now);

        assertThat(changed).isZero();
        verify(reservationRepository, never()).saveAll(any());
        verify(parkingSpotRepository, never()).saveAll(any());
    }
}
