package pt.ua.deti.apieasyspot.support;

import java.util.Collection;
import java.util.List;
import java.util.function.Consumer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

public final class TestJwtRequests {

    private TestJwtRequests() {
    }

    public static JwtRequestBuilder jwt() {
        return new JwtRequestBuilder();
    }

    public static RequestPostProcessor jwtWithRole(String subject, String role) {
        return jwt().jwt(jwt -> jwt.subject(subject).claim("groups", List.of(role)));
    }

    public static final class JwtRequestBuilder {

        public RequestPostProcessor jwt(Consumer<Jwt.Builder> customizer) {
            Jwt.Builder builder = Jwt.withTokenValue("test-token").header("alg", "none");
            customizer.accept(builder);

            Jwt token = builder.build();
            Collection<? extends GrantedAuthority> authorities = extractAuthorities(token);
            return SecurityMockMvcRequestPostProcessors.authentication(
                new JwtAuthenticationToken(token, authorities));
        }

        private Collection<? extends GrantedAuthority> extractAuthorities(Jwt token) {
            List<String> groups = token.getClaimAsStringList("groups");
            if (groups == null || groups.isEmpty()) {
                return List.of();
            }
            return groups.stream()
                .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
                .toList();
        }
    }
}