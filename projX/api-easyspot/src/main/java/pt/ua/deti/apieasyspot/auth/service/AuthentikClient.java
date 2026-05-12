package pt.ua.deti.apieasyspot.auth.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;

@Component
@Slf4j
public class AuthentikClient {

    private final String apiUrl;
    private final String token;
    private final HttpClient http = HttpClient.newBuilder()
        .version(HttpClient.Version.HTTP_1_1)
        .build();
    private final ObjectMapper mapper = new ObjectMapper();

    public AuthentikClient(
        @Value("${authentik.api.url}") String apiUrl,
        @Value("${authentik.api.token}") String token
    ) {
        this.apiUrl = apiUrl.replaceAll("/$", "");
        this.token = token;
    }

    public record AuthentikUser(String pk, String username, String email, String name) {}

    public AuthentikUser createUser(String username, String name, String email, String groupPk) {
        try {
            var body = mapper.writeValueAsString(Map.of(
                "username", username,
                "name", name,
                "email", email,
                "is_active", true,
                "groups", List.of(groupPk),
                "type", "internal"
            ));
            var resp = post("/api/v3/core/users/", body);
            return new AuthentikUser(
                resp.get("pk").asText(),
                resp.get("username").asText(),
                resp.get("email").asText(),
                resp.get("name").asText()
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to create Authentik user: " + e.getMessage(), e);
        }
    }

    public void setPassword(String userPk, String password, boolean mustChangeOnLogin) {
        try {
            var body = mapper.writeValueAsString(Map.of("password", password));
            post("/api/v3/core/users/" + userPk + "/set_password/", body);
            if (mustChangeOnLogin) {
                var patchBody = mapper.writeValueAsString(Map.of("password_change_on_login", true));
                patch("/api/v3/core/users/" + userPk + "/", patchBody);
            }
        } catch (Exception e) {
            throw new RuntimeException("Failed to set Authentik password: " + e.getMessage(), e);
        }
    }

    public String findGroupPk(String groupName) {
        try {
            var req = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl + "/api/v3/core/groups/?name=" + groupName))
                .header("Authorization", "Bearer " + token)
                .header("Accept", "application/json")
                .GET()
                .build();
            var resp = http.send(req, HttpResponse.BodyHandlers.ofString());
            JsonNode root = mapper.readTree(resp.body());
            JsonNode results = root.get("results");
            if (results != null && results.isArray() && !results.isEmpty()) {
                return results.get(0).get("pk").asText();
            }
            throw new RuntimeException("Group not found: " + groupName);
        } catch (Exception e) {
            throw new RuntimeException("Failed to find Authentik group: " + e.getMessage(), e);
        }
    }

    public void deleteUser(String userPk) {
        try {
            var req = HttpRequest.newBuilder()
                .uri(URI.create(apiUrl + "/api/v3/core/users/" + userPk + "/"))
                .header("Authorization", "Bearer " + token)
                .DELETE()
                .build();
            http.send(req, HttpResponse.BodyHandlers.ofString());
        } catch (Exception e) {
            log.warn("Failed to delete Authentik user {}: {}", userPk, e.getMessage());
        }
    }

    private JsonNode post(String path, String body) throws Exception {
        var req = HttpRequest.newBuilder()
            .uri(URI.create(apiUrl + path))
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build();
        var resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 300) {
            throw new RuntimeException("Authentik POST " + path + " returned " + resp.statusCode() + ": " + resp.body());
        }
        return mapper.readTree(resp.body());
    }

    private void patch(String path, String body) throws Exception {
        var req = HttpRequest.newBuilder()
            .uri(URI.create(apiUrl + path))
            .header("Authorization", "Bearer " + token)
            .header("Content-Type", "application/json")
            .method("PATCH", HttpRequest.BodyPublishers.ofString(body))
            .build();
        var resp = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() >= 300) {
            log.warn("Authentik PATCH {} returned {}: {}", path, resp.statusCode(), resp.body());
        }
    }
}
