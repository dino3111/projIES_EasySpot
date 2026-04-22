package pt.ua.deti.apieasyspot.booking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.booking.model.Reservation;

import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingConfirmationMailService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final JavaMailSender mailSender;

    @Async
    public void sendConfirmation(Reservation reservation) {
        String email = reservation.getUser().getEmail();
        if (email == null || email.isBlank()) {
            log.warn("Cannot send booking confirmation: user {} has no email", reservation.getUser().getId());
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(email);
            msg.setSubject("EasySpot — Reserva confirmada " + reservation.getBookingCode());
            msg.setText(buildBody(reservation));
            mailSender.send(msg);
            log.info("Booking confirmation email sent to {} for reservation {}", email, reservation.getBookingCode());
        } catch (Exception ex) {
            log.warn("Failed to send booking confirmation email for {} (reservation still confirmed): {}",
                reservation.getBookingCode(), ex.getMessage());
        }
    }

    private String buildBody(Reservation reservation) {
        String spot = reservation.getParkingSpot() != null
            ? "Lugar " + reservation.getParkingSpot().getSpotNumber()
            : "A atribuir no momento de chegada";

        return """
            A sua reserva foi confirmada com sucesso!

            Código de reserva : %s
            Parque            : %s
            Morada            : %s
            Lugar             : %s
            Chegada prevista  : %s
            Saída prevista    : %s
            Custo estimado    : €%.2f

            A reserva é válida por 30 minutos após a hora marcada.
            Se não comparecer dentro desse período, o lugar será libertado.

            Boas viagens,
            Equipa EasySpot
            """.formatted(
            reservation.getBookingCode(),
            reservation.getParkingLot().getName(),
            reservation.getParkingLot().getAddress(),
            spot,
            FMT.format(reservation.getArrivalTime()),
            FMT.format(reservation.getDepartureTime()),
            reservation.getEstimatedCost() != null ? reservation.getEstimatedCost() : 0
        );
    }
}
