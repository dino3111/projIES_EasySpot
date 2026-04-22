package pt.ua.deti.apieasyspot.notification.model;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import pt.ua.deti.apieasyspot.auth.model.User;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Entity
@Table(
    name = "alert_subscriptions",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_alert_subscription_user_type_park_scope",
        columnNames = {"user_id", "alert_type", "park_scope_key"}
    )
)
public class AlertSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "alert_type", nullable = false, length = 40)
    private AlertSubscriptionType alertType;

    @Column(name = "park_ids_csv", length = 1000)
    private String parkIdsCsv;

    @Column(name = "park_scope_key", nullable = false, length = 1000)
    private String parkScopeKey;

    @Column(name = "vehicle_id", length = 100)
    private String vehicleId;

    @Column(length = 255, nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(name = "schedule_frequency", length = 20)
    private SummaryFrequency scheduleFrequency;

    @Column(name = "schedule_time", length = 5)
    private String scheduleTime;

    @Column(name = "schedule_timezone", length = 80)
    private String scheduleTimezone;

    @Column(nullable = false, columnDefinition = "boolean default true")
    private boolean enabled = true;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
