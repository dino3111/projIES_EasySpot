package pt.ua.deti.apieasyspot;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pt.ua.deti.apieasyspot.billing.service.StripeService;

@SpringBootTest(properties = {
    "STRIPE_API_KEY=sk_test_dummy",
    "STRIPE_WEBHOOK_SECRET=whsec_dummy",
    "spring.mail.host=localhost",
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.database-platform=org.hibernate.dialect.H2Dialect",
    "authentik.issuer=http://localhost:9000/authentik/",
    "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=http://localhost:9000/authentik/application/o/easyspot/jwks/",
    "cors.allowed-origins=http://localhost:5173"
})
class ApiEasyspotApplicationTests {

    @MockitoBean
    JavaMailSender mailSender;

    @MockitoBean
    StripeService stripeService;

    @MockitoBean
    KafkaTemplate<String, String> kafkaTemplate;

    @Test
    void contextLoads() {
    }

}
