package pt.ua.deti.apieasyspot.postman;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;
import pt.ua.deti.apieasyspot.vehicle.service.VehicleLookupClient;

@Configuration
@Profile("postman")
class PostmanConfig {

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
}