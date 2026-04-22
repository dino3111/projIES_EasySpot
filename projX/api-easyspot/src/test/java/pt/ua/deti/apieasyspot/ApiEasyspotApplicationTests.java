package pt.ua.deti.apieasyspot;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pt.ua.deti.apieasyspot.billing.service.StripeService;
import pt.ua.deti.apieasyspot.booking.event.ReservationEventPublisher;

@SpringBootTest(properties = {
    "STRIPE_API_KEY=sk_test_dummy",
    "STRIPE_WEBHOOK_SECRET=whsec_dummy",
    "spring.mail.host=localhost",
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "spring.autoconfigure.exclude=org.springframework.boot.autoconfigure.kafka.KafkaAutoConfiguration"
})
class ApiEasyspotApplicationTests {

    @MockitoBean
    JavaMailSender mailSender;

    @MockitoBean
    StripeService stripeService;

    @MockitoBean
    ReservationEventPublisher reservationEventPublisher;

    @Test
    void contextLoads() {
    }

}
