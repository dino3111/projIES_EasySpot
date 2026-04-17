package pt.ua.deti.apieasyspot.postman;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleLookupClient;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

@Configuration
@Profile("postman")
class PostmanConfig {

    @Bean
    SecretKey postmanJwtSecret(
        @Value("${postman.jwt.secret:easyspot-postman-secret-key-change-me-2026}") String secret
    ) {
        return new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    @Bean
    @Primary
    JwtDecoder postmanJwtDecoder(SecretKey postmanJwtSecret) {
        return NimbusJwtDecoder.withSecretKey(postmanJwtSecret)
            .macAlgorithm(MacAlgorithm.HS256)
            .build();
    }

    @Bean
    JwtEncoder postmanJwtEncoder(SecretKey postmanJwtSecret) {
        return new NimbusJwtEncoder(new ImmutableSecret<>(postmanJwtSecret));
    }

    @Bean
    @Primary
    VehicleLookupClient stubVehicleLookupClient(
        @Value("${infomatricula.base-url}") String baseUrl,
        @Value("${infomatricula.firebase-api-key}") String apiKey
    ) {
        return new VehicleLookupClient(baseUrl, apiKey) {
            @Override
            public VehicleData lookup(String plate) {
                return new VehicleData(
                    plate, null, "TestMake", "TestModel",
                    "1.0 TSI", "2020-01-01", "Branco", "Gasolina",
                    null, null, null, null, null, null,
                    null, null, null, null, null, null
                );
            }
        };
    }

    @Bean
    @Primary
    R2StorageService stubR2StorageService() {
        return new R2StorageService("test-account", "test-key", "test-secret", "test-bucket", "http://localhost/r2") {
            @Override
            public String upload(String key, byte[] data, String contentType) {
                return "http://localhost/r2/" + key;
            }
        };
    }
}
