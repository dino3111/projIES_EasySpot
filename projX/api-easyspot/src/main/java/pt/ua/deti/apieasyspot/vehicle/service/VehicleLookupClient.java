package pt.ua.deti.apieasyspot.vehicle.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import pt.ua.deti.apieasyspot.common.exception.ExternalServiceException;
import pt.ua.deti.apieasyspot.common.exception.PlateNotFoundException;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;

@Component
public class VehicleLookupClient {

    private static final Logger log = LoggerFactory.getLogger(VehicleLookupClient.class);

    private final RestClient restClient;

    public VehicleLookupClient(
        @Value("${scraper.base-url}") String baseUrl,
        @Value("${scraper.api-key}") String apiKey
    ) {
        this.restClient = RestClient.builder()
            .baseUrl(baseUrl)
            .requestInterceptor((request, body, execution) -> {
                request.getHeaders().set("X-API-Key", apiKey);
                return execution.execute(request, body);
            })
            .build();
    }

    public VehicleData lookup(String plate) {
        log.info("Scraper lookup plate={}", plate);
        try {
            ScraperLookupPayload payload = restClient.get()
                .uri(uriBuilder -> uriBuilder.path("/lookup").queryParam("plate", plate).build())
                .retrieve()
                .body(ScraperLookupPayload.class);
            if (payload == null) {
                throw new ExternalServiceException("Empty response from scraper service");
            }
            return mapToVehicleData(plate, payload);
        } catch (RestClientResponseException ex) {
            HttpStatusCode status = ex.getStatusCode();
            log.error("Scraper lookup failed plate={} status={} body={}", plate, status, ex.getResponseBodyAsString());
            if (status.value() == 404) {
                throw new PlateNotFoundException("Plate not found in scraper registry: " + plate, ex);
            }
            if (status.value() == 503) {
                throw new ExternalServiceException("Vehicle lookup service temporarily unavailable", ex);
            }
            throw new ExternalServiceException("Could not fetch vehicle data for plate: " + plate, ex);
        } catch (PlateNotFoundException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Scraper lookup unexpected error plate={}", plate, ex);
            throw new ExternalServiceException("Could not fetch vehicle data for plate: " + plate, ex);
        }
    }

    private VehicleData mapToVehicleData(String plate, ScraperLookupPayload payload) {
        return new VehicleData(
            plate,
            payload.vin(),
            payload.make(),
            payload.model(),
            payload.version(),
            payload.yearFrom(),
            payload.yearTo(),
            payload.fuelType(),
            payload.powerKw(),
            payload.powerCv(),
            payload.displacementCc(),
            payload.cylinders(),
            payload.bodyType(),
            payload.driveType(),
            payload.engineCode(),
            payload.engineType(),
            payload.imageRelativeUrl(),
            payload.sourceCarId() != null ? String.valueOf(payload.sourceCarId()) : null,
            payload.canonicalUrl()
        );
    }

    private record ScraperLookupPayload(
        String plate,
        String make,
        String model,
        String version,
        Integer sourceCarId,
        Integer sourceMakerId,
        Integer sourceModelId,
        String canonicalUrl,
        String vin,
        String engineType,
        Integer yearFrom,
        Integer yearTo,
        String bodyType,
        String driveType,
        Double powerKw,
        Double powerCv,
        Integer displacementCc,
        Integer cylinders,
        String fuelType,
        String engineCode,
        String imageRelativeUrl
    ) {}
}
