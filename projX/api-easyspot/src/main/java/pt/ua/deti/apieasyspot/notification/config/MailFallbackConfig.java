package pt.ua.deti.apieasyspot.notification.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.SimpleMailMessage;
import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Configuration
public class MailFallbackConfig {

    @Bean
    @ConditionalOnMissingBean(JavaMailSender.class)
    JavaMailSender javaMailSenderFallback() {
        return new JavaMailSenderImpl() {
            @Override
            public void send(SimpleMailMessage... simpleMessages) {
                log.debug("SMTP is not configured; dropping {} simple mail message(s)", simpleMessages == null ? 0 : simpleMessages.length);
            }

            @Override
            public void send(MimeMessage... mimeMessages) {
                log.debug("SMTP is not configured; dropping {} mime message(s)", mimeMessages == null ? 0 : mimeMessages.length);
            }
        };
    }
}
