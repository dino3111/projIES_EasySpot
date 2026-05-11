package pt.ua.deti.apieasyspot.booking.service;

import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.notification.service.EmailDeliveryDedupService;
import pt.ua.deti.apieasyspot.booking.model.Reservation;

import java.time.format.DateTimeFormatter;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingConfirmationMailService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final EmailDeliveryDedupService emailDeliveryDedupService;

    @Value("${spring.mail.from:noreply@easyspot.pt}")
    private String fromAddress;

    @Async
    public void sendConfirmation(Reservation reservation) {
        String email = reservation.getUser().getEmail();
        if (email == null || email.isBlank()) {
            log.warn("Cannot send booking confirmation: user {} has no email", reservation.getUser().getId());
            return;
        }
        String deliveryKey = "booking-confirmation:" + reservation.getId();
        try {
            MimeMessage mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, false, "UTF-8");
            helper.setFrom(fromAddress);
            helper.setTo(email);
            helper.setSubject("EasySpot — Reserva Confirmada " + reservation.getBookingCode());
            helper.setText(buildHtml(reservation), true);
            mailSender.send(mime);
            log.info("Booking confirmation email sent to {} for reservation {}", email, reservation.getBookingCode());
        } catch (Exception ex) {
            log.warn("Failed to send booking confirmation email for {} (reservation still confirmed): {}",
                reservation.getBookingCode(), ex.getMessage());
        }
    }

    private String buildHtml(Reservation reservation) {
        String spot = reservation.getParkingSpot() != null
            ? reservation.getParkingSpot().getSpotNumber()
            : "A atribuir na chegada";
        String cost = reservation.getEstimatedCost() != null
            ? String.format("€%.2f", reservation.getEstimatedCost())
            : "—";

        return """
            <!DOCTYPE html>
            <html lang="pt">
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
            <body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,sans-serif;color:#18181a">
            <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:40px 16px">
            <tr><td align="center">
            <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid rgba(115,87,236,0.15)">

              <tr>
                <td style="padding:28px 40px 24px;border-bottom:1px solid #ececf0">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:linear-gradient(135deg,#2e1c7c,#7357ec);border-radius:10px;width:40px;height:40px;text-align:center;vertical-align:middle">
                        <span style="font-size:20px;font-weight:900;color:#fff">P</span>
                      </td>
                      <td style="padding-left:10px">
                        <span style="font-size:22px;font-weight:800;color:#18181a">Easy</span><span style="font-size:22px;font-weight:800;color:#7357ec">Spot</span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:32px 40px 8px">
                  <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7357ec">Confirmação de Reserva</div>
                  <div style="font-size:26px;font-weight:800;color:#18181a;margin-top:6px">O seu lugar está garantido.</div>
                  <div style="font-size:14px;color:#717182;margin-top:6px">A sua reserva foi processada com sucesso. Guarde este email como comprovativo.</div>
                </td>
              </tr>

              <tr>
                <td style="padding:24px 40px">
                  <div style="background:#f3f0fd;border-radius:10px;padding:20px 24px;width:100%%;box-sizing:border-box">
                    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#5948a6">Código de Reserva</div>
                    <div style="font-size:30px;font-weight:900;color:#7357ec;letter-spacing:4px;font-family:monospace;margin-top:6px">%s</div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:0 40px 32px">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="border:1px solid #ececf0;border-radius:10px;overflow:hidden">
                    <tr style="background:#fafafa">
                      <td style="padding:10px 18px;font-size:12px;color:#717182;width:40%%">Parque</td>
                      <td style="padding:10px 18px;font-size:13px;font-weight:700;color:#18181a">%s</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 18px;font-size:12px;color:#717182;border-top:1px solid #ececf0">Morada</td>
                      <td style="padding:10px 18px;font-size:13px;font-weight:600;color:#18181a;border-top:1px solid #ececf0">%s</td>
                    </tr>
                    <tr style="background:#fafafa">
                      <td style="padding:10px 18px;font-size:12px;color:#717182;border-top:1px solid #ececf0">Lugar</td>
                      <td style="padding:10px 18px;font-size:13px;font-weight:600;color:#18181a;border-top:1px solid #ececf0">%s</td>
                    </tr>
                    <tr>
                      <td style="padding:10px 18px;font-size:12px;color:#717182;border-top:1px solid #ececf0">Chegada prevista</td>
                      <td style="padding:10px 18px;font-size:13px;font-weight:600;color:#18181a;border-top:1px solid #ececf0">%s</td>
                    </tr>
                    <tr style="background:#fafafa">
                      <td style="padding:10px 18px;font-size:12px;color:#717182;border-top:1px solid #ececf0">Saída prevista</td>
                      <td style="padding:10px 18px;font-size:13px;font-weight:600;color:#18181a;border-top:1px solid #ececf0">%s</td>
                    </tr>
                    <tr>
                      <td style="padding:12px 18px;font-size:12px;color:#717182;border-top:1px solid #ececf0">Custo estimado</td>
                      <td style="padding:12px 18px;font-size:18px;font-weight:900;color:#7357ec;border-top:1px solid #ececf0">%s</td>
                    </tr>
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 40px 32px">
                  <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;padding:12px 16px;font-size:13px;color:#78350f">
                    A reserva é válida por <strong>30 minutos</strong> após a hora marcada. Se não comparecer dentro desse período, o lugar será libertado automaticamente.
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:20px 40px;border-top:1px solid #ececf0">
                  <div style="font-size:12px;color:#717182">Boas viagens,<br><strong style="color:#18181a">Equipa EasySpot</strong></div>
                  <div style="font-size:11px;color:#a99be8;margin-top:10px">Este email foi gerado automaticamente. Por favor não responda a este endereço.</div>
                </td>
              </tr>

            </table>
            </td></tr>
            </table>
            </body></html>
            """.formatted(
                reservation.getBookingCode(),
                reservation.getParkingLot().getName(),
                reservation.getParkingLot().getAddress(),
                spot,
                FMT.format(reservation.getArrivalTime()),
                FMT.format(reservation.getDepartureTime()),
                cost
        );
    }
}
