package pt.ua.deti.apieasyspot.billing.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "processed_stripe_events")
public class StripeEvent {

    @Id
    private String eventId;

    @CreationTimestamp
    private OffsetDateTime processedAt;
}
