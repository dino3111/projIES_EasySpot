package pt.ua.deti.apieasyspot.notification.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;
import java.util.UUID;

@Data
@Entity
@Table(
    name = "notification_email_deliveries",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_notification_email_delivery_key",
        columnNames = "delivery_key"
    )
)
public class NotificationEmailDelivery {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "delivery_key", nullable = false, length = 255)
    private String deliveryKey;

    @Column(nullable = false, length = 80)
    private String category;

    @Column(nullable = false, length = 255)
    private String recipient;

    @Column(nullable = false, length = 255)
    private String subject;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationEmailDeliveryStatus status;

    @Column(length = 1000)
    private String errorMessage;

    private OffsetDateTime sentAt;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;
}
