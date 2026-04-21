package pt.ua.deti.apieasyspot;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import pt.ua.deti.apieasyspot.billing.service.StripeService;

@SpringBootTest(properties = {
    "STRIPE_API_KEY=sk_test_dummy",
    "STRIPE_WEBHOOK_SECRET=whsec_dummy",
    "spring.mail.host=localhost"
})
@Import({TestcontainersConfiguration.class, ApiEasyspotApplicationTests.TestConfig.class})
class ApiEasyspotApplicationTests {

    @MockitoBean
    JavaMailSender mailSender;

    @MockitoBean
    StripeService stripeService;

    @Test
    void contextLoads() {
    }

    @TestConfiguration
    static class TestConfig {

        @Bean
        ObjectMapper objectMapper() {
            return new ObjectMapper();
        }
    }

}
