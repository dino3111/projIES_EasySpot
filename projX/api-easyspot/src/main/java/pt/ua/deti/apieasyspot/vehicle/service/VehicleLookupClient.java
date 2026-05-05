package pt.ua.deti.apieasyspot.vehicle.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import pt.ua.deti.apieasyspot.common.exception.ExternalServiceException;
import pt.ua.deti.apieasyspot.vehicle.dto.InsuranceData;
import pt.ua.deti.apieasyspot.vehicle.dto.VehicleData;

/**
 * Client responsible for fetching vehicle data from the InfoMatrícula external API.
 *
 * InfoMatrícula requires a Firebase Anonymous Auth token on every request.
 * Since Firebase anonymous tokens are short-lived (~1 hour), this client caches the token
 * and only requests a new one when the current one is about to expire.
 *
 * Auth flow:
 *   1. POST to Firebase Identity Toolkit with returnSecureToken=true → receives idToken + expiresIn
 *   2. Use that idToken as a Bearer token on every request to api.infomatricula.pt
 */
@Component
public class VehicleLookupClient {

    private final RestClient restClient;
    private final String firebaseApiKey;

    // Cached Firebase token and its expiry timestamp (epoch millis)
    private String cachedToken;
    private long tokenExpiresAt;

    private static final String APP_CHECK_TOKEN = "eyJraWQiOiJrMnhhbUEiLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjUxMzM1ODgwNDUzNDp3ZWI6MWUyNzY2MWMxYWVhMGMyZmM2Y2E5NyIsImF1ZCI6WyJwcm9qZWN0cy81MTMzNTg4MDQ1MzQiLCJwcm9qZWN0cy8pbmZvbWF0cmljdWxhLWxvZ2luIl0sInByb3ZpZGVyIjoicmVjYXB0Y2hhX2VudGVycHJpc2UiLCJpc3MiOiJodHRwczovL2ZpcmViYXNlYXBwY2hlY2suZ29vZ2xlYXBpcy5jb20vNTEzMzU4ODA0NTM0IiwiZXhwIjoxNzc3OTkzNTE1LCJpYXQiOjE3Nzc5ODYzMTUsImp0aSI6Ikc1Zk9rdFk5Y1FydzBPX0dDUjNmU0hLdXBKOW5manlQWTJrcWd4dXBSYUkifQ.MRX9wwbgZtKXWWr_Jblr_CNvvK2FONrcrtbqrzxVBX41k13JOQuO2mF1zJxwHPIg1rtpnsyk9e1eForvlSVRokSSIADTA9ivUJfRbLtH5Z6JJPxfzbj7UgPsj9vFZpcfoG03PIKhGwOLgdJTIl2_DikUMWl5qfKUm50--jH14lOm5bHR6tB_DjjVtQKOeHXVCQdFMkJvupmpKXhP3Pv9RSXp5uWYn79qbceymXxo1pjHUaRkki0z7UKFFLLoMDmpVoORoZVgOZ70xNnsPw6Qid1yN_4YKuDBTj8DT6VPTGoUx0HDN11nMbmLeavlaD-b_xO0mrFjB2iYiZ3YuG8_wCn0LA4rQxOhKxhdOGLHMtgO1HOjoIO1AyvtctEuiHA7bv57oZ-LHoOsF8GBYzxowK7YSShiMS50NU-IA2S2H7D8iMLRqM9mp22N9uo_eyUltS8Is-0gT0oovtOtvBnnnZvbc3zeXGOP9xRXdE7hDumWXQ1JPpUvOqSsjJSMA978";

    public VehicleLookupClient(
        @Value("${infomatricula.base-url}") String baseUrl,
        @Value("${infomatricula.firebase-api-key}") String firebaseApiKey
    ) {
        this.restClient = RestClient.builder().baseUrl(baseUrl).build();
        this.firebaseApiKey = firebaseApiKey;
    }

    /**
     * Fetches vehicle data for the given licence plate from the InfoMatrícula API.
     * Automatically handles Firebase authentication before the request.
     */
    public VehicleData lookup(String plate) {
        try {
            String token = getToken();
            VehicleData result = restClient.get()
                .uri("/informacao/fetch?plate={plate}", plate)
                .header("Authorization", "Bearer " + token)
                .header("X-Firebase-AppCheck", APP_CHECK_TOKEN)
                .header("Accept", "application/json")
                .retrieve()
                .body(VehicleData.class);
            if (result == null || result.make() == null)
                throw new ExternalServiceException("Plate not found in IMT registry: " + plate);
            return result;
        } catch (ExternalServiceException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ExternalServiceException("Could not fetch vehicle data for plate: " + plate, ex);
        }
    }

    /**
     * Returns a valid Firebase token, using the cached one if still valid.
     * Firebase tokens expire after ~1 hour; we refresh 60 seconds early to avoid edge cases.
     */
    private synchronized String getToken() {
        if (cachedToken != null && System.currentTimeMillis() < tokenExpiresAt) {
            return cachedToken;
        }

        // Firebase Anonymous Sign-Up endpoint — no user credentials required,
        // just the project API key. Returns a short-lived JWT (idToken).
        String firebaseUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=" + firebaseApiKey;

        FirebaseTokenResponse response = RestClient.create().post()
            .uri(firebaseUrl)
            .header("Content-Type", "application/json")
            .body("{\"returnSecureToken\":true}")
            .retrieve()
            .body(FirebaseTokenResponse.class);

        if (response == null)
            throw new ExternalServiceException("Failed to authenticate with the licence plate service.");

        cachedToken = response.idToken();
        // expiresIn is in seconds; subtract 60s as a safety buffer before expiry
        tokenExpiresAt = System.currentTimeMillis() + (Long.parseLong(response.expiresIn()) - 60) * 1000;
        return cachedToken;
    }

    public InsuranceData lookupInsurance(String plate) {
        try {
            String token = getToken();
            return restClient.get()
                .uri("/seguro/fetch?plate={plate}", plate)
                .header("Authorization", "Bearer " + token)
                .header("X-Firebase-AppCheck", APP_CHECK_TOKEN)
                .header("Accept", "application/json")
                .retrieve()
                .body(InsuranceData.class);
        } catch (Exception ex) {
            throw new ExternalServiceException("Could not fetch insurance data for plate: " + plate, ex);
        }
    }

    /** Maps the relevant fields from Firebase's token response. */
    private record FirebaseTokenResponse(String idToken, String expiresIn) {}
}
