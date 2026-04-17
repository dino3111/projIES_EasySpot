package pt.ua.deti.apieasyspot.postman;

import org.springframework.context.annotation.Profile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

@RestController
@Profile("postman")
@RequestMapping("/api/test")
class PostmanTokenController {

    private static final Set<String> SUPPORTED_ROLES = Set.of("DRIVER", "MANAGER", "TECHNICAL");
    private static final String DRIVER_SUB = "auth-sub-postman-driver";

    private final JwtEncoder jwtEncoder;

    PostmanTokenController(JwtEncoder jwtEncoder) {
        this.jwtEncoder = jwtEncoder;
    }

    @GetMapping("/token")
    Map<String, Object> issueToken(
        @RequestParam(defaultValue = "DRIVER") String role,
        @RequestParam(required = false) String sub
    ) {
        String normalizedRole = role.toUpperCase();
        if (!SUPPORTED_ROLES.contains(normalizedRole)) {
            throw new IllegalArgumentException("Unsupported role: " + role);
        }

        String subject = (sub == null || sub.isBlank())
            ? defaultSubject(normalizedRole)
            : sub;

        Instant now = Instant.now();
        JwtClaimsSet claims = JwtClaimsSet.builder()
            .issuer("easyspot-postman")
            .issuedAt(now)
            .expiresAt(now.plusSeconds(3600))
            .subject(subject)
            .claim("groups", List.of(normalizedRole))
            .build();

        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = jwtEncoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();

        return Map.of(
            "access_token", token,
            "token_type", "Bearer",
            "expires_in", 3600
        );
    }

    private String defaultSubject(String role) {
        if ("DRIVER".equals(role)) {
            return DRIVER_SUB;
        }
        return "auth-sub-postman-" + role.toLowerCase();
    }
}

