package pt.ua.deti.apieasyspot.auth;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Slf4j
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Value("${cors.allowed-origins}")
    private String corsAllowedOrigins;

    @Value("${authentik.issuer}")
    private String authentikIssuer;

    @Value("${spring.security.oauth2.resourceserver.jwt.jwk-set-uri}")
    private String jwkSetUri;

    private final CustomJwtAuthenticationConverter customJwtAuthenticationConverter;

    public SecurityConfig(CustomJwtAuthenticationConverter customJwtAuthenticationConverter) {
        this.customJwtAuthenticationConverter = customJwtAuthenticationConverter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.ignoringRequestMatchers(
                "/api/**", "/ws/**", "/actuator/**", "/v3/api-docs/**",
                "/swagger-ui/**", "/swagger-ui.html"
            ))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .oauth2ResourceServer(oauth2 -> oauth2
                .jwt(jwt -> jwt.jwtAuthenticationConverter(customJwtAuthenticationConverter))
                .authenticationEntryPoint(jwtAuthEntryPoint())
                .accessDeniedHandler(jwtAccessDeniedHandler())
            )
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(jwtAuthEntryPoint())
                .accessDeniedHandler(jwtAccessDeniedHandler())
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/actuator/health").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/test/token").permitAll()
                .requestMatchers("/api/stripe/webhook").permitAll()
                .requestMatchers("/api/parks/list", "/api/parks/*/details", "/api/parks/cities").permitAll()
                .requestMatchers("/ws/**").permitAll()
                .requestMatchers("/api/test/**").authenticated()
                .anyRequest().authenticated());

        return http.build();
    }

    @Bean
    public AuthenticationEntryPoint jwtAuthEntryPoint() {
        return (request, response, authException) -> {
            String authHeader = request.getHeader("Authorization");
            String hasBearer = authHeader != null && authHeader.startsWith("Bearer ") ? "yes" : "no";
            String cause = authException.getCause() != null ? authException.getCause().getMessage() : "n/a";
            log.warn("[AUTH-401] {} {} → unauthorized: reason='{}' cause='{}' bearer={} origin={}",
                request.getMethod(), request.getRequestURI(),
                authException.getMessage(), cause, hasBearer, request.getHeader("Origin"));
            writeProblem(response, HttpStatus.UNAUTHORIZED, "JWT inválido ou em falta", authException.getMessage());
        };
    }

    @Bean
    public AccessDeniedHandler jwtAccessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            log.warn("[AUTH-403] {} {} → forbidden: reason='{}' user={}",
                request.getMethod(), request.getRequestURI(),
                accessDeniedException.getMessage(),
                request.getUserPrincipal() != null ? request.getUserPrincipal().getName() : "anonymous");
            writeProblem(response, HttpStatus.FORBIDDEN, "Acesso negado", accessDeniedException.getMessage());
        };
    }

    private void writeProblem(jakarta.servlet.http.HttpServletResponse response,
                              HttpStatus status, String title, String detail) throws java.io.IOException {
        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        String safeDetail = detail == null ? "" : detail.replace("\"", "'");
        response.getWriter().write(String.format(
            "{\"type\":\"about:blank\",\"title\":\"%s\",\"status\":%d,\"detail\":\"%s\"}",
            title, status.value(), safeDetail));
    }

    @Bean
    public JwtDecoder jwtDecoder() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(10000); // Aumentado para dar tempo ao Authentik de responder
        factory.setReadTimeout(15000);
        RestTemplate restTemplate = new RestTemplate(factory);

        log.info("[JWT-CONFIG] decoder boot: jwkSetUri='{}' expectedIssuer='{}'", jwkSetUri, authentikIssuer);

        NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri)
            .restOperations(restTemplate)
            .build();
            
        // Validator flexível para evitar rejeições por pequenos desvios de tempo ou issuer
        OAuth2TokenValidator<Jwt> validator = JwtValidators.createDefaultWithIssuer(authentikIssuer);
        decoder.setJwtValidator(validator);
        return decoder;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.asList(corsAllowedOrigins.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
