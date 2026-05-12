package pt.ua.deti.apieasyspot.billing.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PaymentRecordRepository extends JpaRepository<PaymentRecord, UUID> {
    Optional<PaymentRecord> findByStripeSessionId(String stripeSessionId);
    Optional<PaymentRecord> findByPaymentIntentId(String paymentIntentId);
    Optional<PaymentRecord> findTopByReservationIdOrderByCreatedAtDesc(UUID reservationId);
    Optional<PaymentRecord> findTopByReservationIdAndPaymentIntentIdIsNotNullAndAmountGreaterThanAndStatusInOrderByCreatedAtDesc(
        UUID reservationId,
        BigDecimal amount,
        Collection<PaymentStatus> statuses
    );
}
