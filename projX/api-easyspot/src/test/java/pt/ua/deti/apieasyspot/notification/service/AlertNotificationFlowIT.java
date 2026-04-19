package pt.ua.deti.apieasyspot.notification.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscription;
import pt.ua.deti.apieasyspot.notification.model.AlertSubscriptionType;
import pt.ua.deti.apieasyspot.notification.model.SummaryFrequency;
import pt.ua.deti.apieasyspot.notification.repository.AlertSubscriptionRepository;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.repository.ParkingLotRepository;

import java.time.Instant;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

@SpringBootTest
@TestPropertySource(properties = {
    "alerts.kafka.max-lag-seconds=120"
})
class AlertNotificationFlowIT {

    @Autowired
    private AlertSubscriptionRepository alertSubscriptionRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ParkingLotRepository parkingLotRepository;

    @Autowired
    private AlertEventKafkaListener kafkaListener;

    @Autowired
    private AlertSummarySchedulerService summarySchedulerService;

    @MockitoBean
    private SimpMessagingTemplate messagingTemplate;

    @MockitoBean
    private JavaMailSender mailSender;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    private User driver;
    private ParkingLot lot;

    @BeforeEach
    void setUp() {
        alertSubscriptionRepository.deleteAll();
        parkingLotRepository.deleteAll();
        userRepository.deleteAll();

        driver = new User();
        driver.setAuthentikUserId("driver-sub-flow");
        driver.setEmail("driver@easyspot.pt");
        driver.setName("Driver Flow");
        driver.setRole("DRIVER");
        driver = userRepository.save(driver);

        lot = new ParkingLot();
        lot.setName("Flow Lot");
        lot.setCity("Aveiro");
        lot.setAddress("Rua Flow 1");
        lot.setLatitude(40.6405);
        lot.setLongitude(-8.6531);
        lot.setTotalSpaces(80);
        lot = parkingLotRepository.save(lot);
    }

    @Test
    @DisplayName("Kafka trigger simulation - sends websocket notification to matched subscriber")
    void kafkaTriggerSimulation_dispatchesWebsocket() {
        AlertSubscription sub = new AlertSubscription();
        sub.setUser(driver);
        sub.setAlertType(AlertSubscriptionType.SPACE_AVAILABLE);
        sub.setParkIdsCsv(lot.getId().toString());
        sub.setParkScopeKey(lot.getId().toString());
        sub.setEmail(driver.getEmail());
        sub.setEnabled(true);
        alertSubscriptionRepository.save(sub);

        String payload = """
            {
              "alertType":"SPACE_AVAILABLE",
              "parkId":"%s",
              "vehicleId":"AA-11-AA",
              "message":"Space became available",
              "occurredAt":"%s",
              "source":"OccupancyModule"
            }
            """.formatted(lot.getId(), Instant.now());

        kafkaListener.onEvent(payload);

        verify(messagingTemplate).convertAndSend(
            eq("/topic/alerts/" + driver.getAuthentikUserId()),
            any(pt.ua.deti.apieasyspot.notification.dto.AlertTriggerEvent.class)
        );
    }

    @Test
    @DisplayName("Kafka lag edge case - old event is ignored")
    void kafkaLagEdgeCase_oldEventIgnored() {
        AlertSubscription sub = new AlertSubscription();
        sub.setUser(driver);
        sub.setAlertType(AlertSubscriptionType.SPACE_AVAILABLE);
        sub.setParkIdsCsv(lot.getId().toString());
        sub.setParkScopeKey(lot.getId().toString());
        sub.setEmail(driver.getEmail());
        sub.setEnabled(true);
        alertSubscriptionRepository.save(sub);

        String payload = """
            {
              "alertType":"SPACE_AVAILABLE",
              "parkId":"%s",
              "occurredAt":"%s",
              "source":"OccupancyModule"
            }
            """.formatted(lot.getId(), Instant.now().minusSeconds(900));

        kafkaListener.onEvent(payload);

        verify(messagingTemplate, never()).convertAndSend(
            anyString(),
            any(pt.ua.deti.apieasyspot.notification.dto.AlertTriggerEvent.class)
        );
    }

    @Test
    @DisplayName("Daily summary scheduler - sends SMTP email when due")
    void summaryScheduler_sendsEmail() {
        AlertSubscription summary = new AlertSubscription();
        summary.setUser(driver);
        summary.setAlertType(AlertSubscriptionType.DAILY_SUMMARY);
        summary.setParkIdsCsv(lot.getId().toString());
        summary.setParkScopeKey(lot.getId().toString());
        summary.setEmail("summary@easyspot.pt");
        summary.setScheduleFrequency(SummaryFrequency.DAILY);
        summary.setScheduleTimezone("UTC");
        summary.setScheduleTime("10:45");
        summary.setEnabled(true);
        alertSubscriptionRepository.save(summary);

        summarySchedulerService.runDueSummaries(Instant.parse("2026-04-19T10:45:10Z"));

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    @DisplayName("Scheduler misconfiguration edge case - invalid timezone is skipped without failure")
    void schedulerMisconfiguration_invalidTimezoneSkipped() {
        AlertSubscription summary = new AlertSubscription();
        summary.setUser(driver);
        summary.setAlertType(AlertSubscriptionType.DAILY_SUMMARY);
        summary.setParkScopeKey("*");
        summary.setEmail("summary@easyspot.pt");
        summary.setScheduleFrequency(SummaryFrequency.DAILY);
        summary.setScheduleTimezone("Invalid/Timezone");
        summary.setScheduleTime("10:45");
        summary.setEnabled(true);
        alertSubscriptionRepository.save(summary);

        summarySchedulerService.runDueSummaries(Instant.parse("2026-04-19T10:45:00Z"));

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }
}
