package pt.ua.deti.apieasyspot.vehicle.service;

import com.fasterxml.jackson.databind.JsonNode;
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
            JsonNode payload = restClient.get()
                .uri(uriBuilder -> uriBuilder.path("/lookup").queryParam("plate", plate).build())
                .retrieve()
                .body(JsonNode.class);
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

    private VehicleData mapToVehicleData(String plate, JsonNode node) {
        return new VehicleData(
            plate,
            text(node, "vin"),
            text(node, "make"),
            text(node, "model"),
            text(node, "version"),
            integer(node, "yearFrom"),
            integer(node, "yearTo"),
            text(node, "fuelType"),
            number(node, "powerKw"),
            number(node, "powerCv"),
            integer(node, "displacementCc"),
            integer(node, "cylinders"),
            text(node, "bodyType"),
            text(node, "driveType"),
            text(node, "engineCode"),
            text(node, "engineType"),
            text(node, "imageRelativeUrl"),
            text(node, "sourceCarId"),
            text(node, "canonicalUrl")
        );
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) return null;
        if (value.isNumber()) return value.asText();
        return value.asText().isBlank() ? null : value.asText();
    }

    private static Integer integer(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || !value.canConvertToInt()) return null;
        return value.asInt();
    }

    private static Double number(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull() || !value.isNumber()) return null;
        return value.asDouble();
    }
}
