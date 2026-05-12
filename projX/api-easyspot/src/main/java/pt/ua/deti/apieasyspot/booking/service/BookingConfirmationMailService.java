package pt.ua.deti.apieasyspot.booking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.notification.service.EmailDeliveryDedupService;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;

import java.math.BigDecimal;
import java.time.format.DateTimeFormatter;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingConfirmationMailService {

    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    private final EmailDeliveryDedupService emailDeliveryDedupService;
    private final PaymentRecordRepository paymentRecordRepository;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Async
    public void sendConfirmation(Reservation reservation) {
        send(
            reservation,
            "booking-confirmation:" + reservation.getId(),
            "BOOKING_CONFIRMATION",
            "EasySpot — Reserva confirmada " + reservation.getBookingCode(),
            buildConfirmationBody(reservation),
            buildConfirmationHtml(reservation)
        );
    }

    @Async
    public void sendUpdate(Reservation reservation, BigDecimal previousCost, BigDecimal newCost, BigDecimal delta) {
        send(
            reservation,
            "booking-update:" + reservation.getId() + ":" + reservation.getArrivalTime() + ":" + reservation.getEstimatedCost(),
            "BOOKING_UPDATE",
            "EasySpot — Reserva atualizada " + reservation.getBookingCode(),
            buildUpdateBody(reservation, previousCost, newCost, delta),
            buildUpdateHtml(reservation, previousCost, newCost, delta)
        );
    }

    @Async
    public void sendCancellation(Reservation reservation, BigDecimal refundedAmount, boolean refundSucceeded) {
        send(
            reservation,
            "booking-cancellation:" + reservation.getId(),
            "BOOKING_CANCELLATION",
            "EasySpot — Reserva cancelada " + reservation.getBookingCode(),
            buildCancellationBody(reservation, refundedAmount, refundSucceeded),
            buildCancellationHtml(reservation, refundedAmount, refundSucceeded)
        );
    }

    private void send(Reservation reservation, String deliveryKey, String category, String subject, String body, String htmlBody) {
        String email = reservation.getUser() != null ? reservation.getUser().getEmail() : null;
        if (email == null || email.isBlank()) {
            log.warn("Cannot send {}: user has no email (reservation {})", category, reservation.getBookingCode());
            return;
        }
        try {
            boolean sent = emailDeliveryDedupService.sendOnce(deliveryKey, category, email, subject, body, htmlBody);
            if (!sent) {
                log.debug("Skipping duplicate {} email for reservation {}", category, reservation.getBookingCode());
                return;
            }
            log.info("{} email sent to {} for reservation {}", category, email, reservation.getBookingCode());
        } catch (Exception ex) {
            log.warn("Failed to send {} email for {}: {}", category, reservation.getBookingCode(), ex.getMessage());
        }
    }

    private String buildConfirmationBody(Reservation reservation) {
        return """
            A sua reserva foi confirmada com sucesso!

            %s

            Gerir reserva     : %s

            A reserva é válida por 30 minutos após a hora marcada.
            Se não comparecer dentro desse período, o lugar será libertado.

            Boas viagens,
            Equipa EasySpot
            """.formatted(commonDetails(reservation), reservationManagementUrl(reservation));
    }

    private String buildUpdateBody(Reservation reservation, BigDecimal previousCost, BigDecimal newCost, BigDecimal delta) {
        BigDecimal prev = safeAmount(previousCost);
        BigDecimal next = safeAmount(newCost);
        BigDecimal diff = delta != null ? delta : next.subtract(prev);

        return """
            A sua reserva foi atualizada.

            %s

            Valor anterior   : %s
            Novo valor       : %s
            %s

            Gerir reserva     : %s

            Equipa EasySpot
            """.formatted(
            commonDetails(reservation),
            formatMoney(prev),
            formatMoney(next),
            paymentAdjustmentText(diff),
            reservationManagementUrl(reservation)
        );
    }

    private String buildCancellationBody(Reservation reservation, BigDecimal refundedAmount, boolean refundSucceeded) {
        return """
            A sua reserva foi cancelada.

            Código de reserva : %s
            Parque            : %s
            Chegada prevista  : %s
            Saída prevista    : %s

            %s

            Equipa EasySpot
            """.formatted(
            reservation.getBookingCode(),
            reservation.getParkingLot().getName(),
            FMT.format(reservation.getArrivalTime()),
            FMT.format(reservation.getDepartureTime()),
            refundText(refundedAmount, refundSucceeded)
        );
    }

    private String buildConfirmationHtml(Reservation reservation) {
        return buildDevelopStyledHtml(
            "Confirmação de Reserva",
            "O seu lugar está garantido.",
            "A sua reserva foi processada com sucesso. Guarde este email como comprovativo.",
            "Código de Reserva",
            reservation.getBookingCode(),
            reservationRows(reservation, null, null, null, false),
            """
                A reserva é válida por <strong>30 minutos</strong> após a hora marcada.
                Se não comparecer dentro desse período, o lugar será libertado automaticamente.
                """,
            reservationManagementUrl(reservation),
            "Gerir esta reserva"
        );
    }

    private String buildUpdateHtml(Reservation reservation, BigDecimal previousCost, BigDecimal newCost, BigDecimal delta) {
        BigDecimal prev = safeAmount(previousCost);
        BigDecimal next = safeAmount(newCost);
        BigDecimal diff = delta != null ? delta : next.subtract(prev);

        return buildDevelopStyledHtml(
            "Atualização de Reserva",
            "Os detalhes da sua reserva foram alterados.",
            "Revise abaixo os novos horários, valores e o respetivo ajuste de pagamento.",
            "Código de Reserva",
            reservation.getBookingCode(),
            reservationRows(reservation, prev, next, diff, false),
            escapeHtml(paymentAdjustmentText(diff)),
            reservationManagementUrl(reservation),
            "Ver reserva"
        );
    }

    private String buildCancellationHtml(Reservation reservation, BigDecimal refundedAmount, boolean refundSucceeded) {
        return buildDevelopStyledHtml(
            "Cancelamento de Reserva",
            "A sua reserva foi cancelada.",
            "Os detalhes do cancelamento e do eventual reembolso estão resumidos abaixo.",
            "Código de Reserva",
            reservation.getBookingCode(),
            cancellationRows(reservation, refundedAmount, refundSucceeded),
            escapeHtml(refundText(refundedAmount, refundSucceeded)),
            frontendUrl,
            "Abrir EasySpot"
        );
    }

    private String reservationRows(Reservation reservation,
                                   BigDecimal previousCost,
                                   BigDecimal newCost,
                                   BigDecimal delta,
                                   boolean cancellationMode) {
        StringBuilder rows = new StringBuilder();
        appendRow(rows, "Parque", reservation.getParkingLot().getName(), true);
        appendRow(rows, "Morada", reservation.getParkingLot().getAddress(), false);
        appendRow(rows, "Lugar", spotLabel(reservation), true);
        appendRow(rows, "Chegada prevista", FMT.format(reservation.getArrivalTime()), false);
        appendRow(rows, "Saída prevista", FMT.format(reservation.getDepartureTime()), true);
        appendRow(rows, "Custo estimado", formatMoney(safeAmount(reservation.getEstimatedCost())), false);

        if (!cancellationMode && previousCost != null && newCost != null) {
            appendRow(rows, "Valor anterior", formatMoney(previousCost), true);
            appendRow(rows, "Novo valor", formatMoney(newCost), false);
            appendRow(rows, "Ajuste", paymentAdjustmentShortText(delta), true);
        }

        appendRow(rows, "Veículo", vehicleLabel(reservation.getVehicle()), false);
        appendRow(rows, "Pagamento", paymentBlock(reservation), true);
        return rows.toString();
    }

    private String cancellationRows(Reservation reservation, BigDecimal refundedAmount, boolean refundSucceeded) {
        StringBuilder rows = new StringBuilder();
        appendRow(rows, "Parque", reservation.getParkingLot().getName(), true);
        appendRow(rows, "Chegada prevista", FMT.format(reservation.getArrivalTime()), false);
        appendRow(rows, "Saída prevista", FMT.format(reservation.getDepartureTime()), true);
        appendRow(rows, "Veículo", vehicleLabel(reservation.getVehicle()), false);
        appendRow(rows, "Estado", "Cancelada", true);
        appendRow(rows, "Reembolso", refundStatusShortText(refundedAmount, refundSucceeded), false);
        return rows.toString();
    }

    private void appendRow(StringBuilder rows, String label, String value, boolean striped) {
        rows.append("""
            <tr%s>
              <td style="padding:10px 18px;font-size:12px;color:#717182%s">%s</td>
              <td style="padding:10px 18px;font-size:13px;font-weight:600;color:#18181a%s">%s</td>
            </tr>
            """.formatted(
            striped ? " style=\"background:#fafafa\"" : "",
            striped ? ";border-top:1px solid #ececf0" : "",
            escapeHtml(label),
            striped ? ";border-top:1px solid #ececf0" : "",
            escapeHtml(value)
        ));
    }

    private String buildDevelopStyledHtml(String kicker,
                                          String headline,
                                          String subtitle,
                                          String badgeLabel,
                                          String badgeValue,
                                          String rowsHtml,
                                          String noticeHtml,
                                          String actionUrl,
                                          String actionLabel) {
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
                  <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#7357ec">%s</div>
                  <div style="font-size:26px;font-weight:800;color:#18181a;margin-top:6px">%s</div>
                  <div style="font-size:14px;color:#717182;margin-top:6px">%s</div>
                </td>
              </tr>

              <tr>
                <td style="padding:24px 40px">
                  <div style="background:#f3f0fd;border-radius:10px;padding:20px 24px;width:100%%;box-sizing:border-box">
                    <div style="font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#5948a6">%s</div>
                    <div style="font-size:30px;font-weight:900;color:#7357ec;letter-spacing:4px;font-family:monospace;margin-top:6px">%s</div>
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:0 40px 32px">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="border:1px solid #ececf0;border-radius:10px;overflow:hidden">
                    %s
                  </table>
                </td>
              </tr>

              <tr>
                <td style="padding:0 40px 20px">
                  <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:6px;padding:12px 16px;font-size:13px;color:#78350f">
                    %s
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:0 40px 32px">
                  <a href="%s" style="display:inline-block;background:#7357ec;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:10px;font-size:14px;font-weight:700;">%s</a>
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
            escapeHtml(kicker),
            escapeHtml(headline),
            escapeHtml(subtitle),
            escapeHtml(badgeLabel),
            escapeHtml(badgeValue),
            rowsHtml,
            noticeHtml,
            actionUrl,
            escapeHtml(actionLabel)
        );
    }

    private String commonDetails(Reservation reservation) {
        return """
            Código de reserva : %s
            Parque            : %s
            Morada            : %s
            Lugar             : %s
            Chegada prevista  : %s
            Saída prevista    : %s
            Custo estimado    : %s

            Veículo           : %s
            %s""".formatted(
            reservation.getBookingCode(),
            reservation.getParkingLot().getName(),
            reservation.getParkingLot().getAddress(),
            spotLabel(reservation),
            FMT.format(reservation.getArrivalTime()),
            FMT.format(reservation.getDepartureTime()),
            formatMoney(safeAmount(reservation.getEstimatedCost())),
            vehicleLabel(reservation.getVehicle()),
            paymentBlock(reservation)
        );
    }

    private String vehicleLabel(Vehicle vehicle) {
        if (vehicle == null) {
            return "(não associado)";
        }
        StringBuilder sb = new StringBuilder();
        sb.append(vehicle.getPlate() != null ? vehicle.getPlate() : "—");
        if (vehicle.getMake() != null || vehicle.getModel() != null) {
            sb.append(" — ");
            if (vehicle.getMake() != null) sb.append(vehicle.getMake()).append(' ');
            if (vehicle.getModel() != null) sb.append(vehicle.getModel());
        }
        if (vehicle.isEv()) sb.append(" (EV)");
        return sb.toString().trim();
    }

    private String paymentBlock(Reservation reservation) {
        Optional<PaymentRecord> latest = paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservation.getId());
        if (latest.isEmpty()) {
            return "Pagamento         : a confirmar";
        }
        PaymentRecord record = latest.get();
        String status = paymentStatusLabel(record.getStatus());
        String amount = record.getAmount() != null ? formatMoney(record.getAmount()) : "—";
        String reference = record.getPaymentIntentId() != null
            ? " · referência Stripe: " + record.getPaymentIntentId()
            : "";
        return "Pagamento         : %s · %s%s".formatted(amount, status, reference);
    }

    private String paymentStatusLabel(PaymentStatus status) {
        if (status == null) return "estado desconhecido";
        return switch (status) {
            case COMPLETED -> "pago";
            case PENDING -> "pendente";
            case FAILED -> "falhou";
            case REFUNDED -> "reembolsado";
            case PARTIALLY_REFUNDED -> "parcialmente reembolsado";
        };
    }

    private String paymentAdjustmentText(BigDecimal delta) {
        BigDecimal diff = safeAmount(delta);
        if (diff.signum() > 0) {
            return "Foi cobrada a diferença de %s no seu método de pagamento Stripe.".formatted(formatMoney(diff));
        }
        if (diff.signum() < 0) {
            return "Foi reembolsada a diferença de %s no seu método de pagamento Stripe.".formatted(formatMoney(diff.abs()));
        }
        return "Não houve alteração no valor da reserva.";
    }

    private String paymentAdjustmentShortText(BigDecimal delta) {
        BigDecimal diff = safeAmount(delta);
        if (diff.signum() > 0) return "+" + formatMoney(diff);
        if (diff.signum() < 0) return "-" + formatMoney(diff.abs());
        return "Sem alteração";
    }

    private String refundText(BigDecimal refundedAmount, boolean refundSucceeded) {
        BigDecimal amount = safeAmount(refundedAmount).abs();
        if (amount.signum() <= 0) {
            return "Não havia valor cobrado a reembolsar.";
        }
        if (refundSucceeded) {
            return "Foram reembolsados %s no seu método de pagamento Stripe.".formatted(formatMoney(amount));
        }
        return ("O reembolso de %s não pôde ser processado automaticamente."
            + " A nossa equipa irá tratar do reembolso manualmente.").formatted(formatMoney(amount));
    }

    private String refundStatusShortText(BigDecimal refundedAmount, boolean refundSucceeded) {
        BigDecimal amount = safeAmount(refundedAmount).abs();
        if (amount.signum() <= 0) return "Sem reembolso";
        if (refundSucceeded) return "Reembolsado " + formatMoney(amount);
        return "Reembolso pendente";
    }

    private String spotLabel(Reservation reservation) {
        return reservation.getParkingSpot() != null
            ? reservation.getParkingSpot().getSpotNumber()
            : "A atribuir na chegada";
    }

    private BigDecimal safeAmount(BigDecimal amount) {
        return amount != null ? amount : BigDecimal.ZERO;
    }

    private String formatMoney(BigDecimal amount) {
        return "€%.2f".formatted(safeAmount(amount));
    }

    private String reservationManagementUrl(Reservation reservation) {
        return frontendUrl + "/reservations?reservationId=" + reservation.getId();
    }

    private String escapeHtml(String value) {
        if (value == null) return "";
        return value
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;");
    }
}
