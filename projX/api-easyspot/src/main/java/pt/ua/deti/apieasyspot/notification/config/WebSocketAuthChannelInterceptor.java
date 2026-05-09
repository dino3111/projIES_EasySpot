package pt.ua.deti.apieasyspot.notification.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.auth.CustomJwtAuthenticationConverter;

import java.util.List;

@Slf4j
@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtDecoder jwtDecoder;
    private final CustomJwtAuthenticationConverter jwtAuthenticationConverter;

    public WebSocketAuthChannelInterceptor(JwtDecoder jwtDecoder,
                                           CustomJwtAuthenticationConverter jwtAuthenticationConverter) {
        this.jwtDecoder = jwtDecoder;
        this.jwtAuthenticationConverter = jwtAuthenticationConverter;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) return message;

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            authenticateConnect(accessor);
        }
        return message;
    }

    private void authenticateConnect(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders == null || authHeaders.isEmpty()) {
            log.warn("[WS-AUTH] STOMP CONNECT rejected: missing Authorization header session={}", accessor.getSessionId());
            throw new IllegalArgumentException("Missing Authorization header on STOMP CONNECT");
        }
        String header = authHeaders.get(0);
        if (!header.startsWith(BEARER_PREFIX)) {
            log.warn("[WS-AUTH] STOMP CONNECT rejected: header not Bearer session={}", accessor.getSessionId());
            throw new IllegalArgumentException("Authorization header must start with 'Bearer '");
        }
        String token = header.substring(BEARER_PREFIX.length()).trim();
        try {
            Jwt jwt = jwtDecoder.decode(token);
            AbstractAuthenticationToken auth = jwtAuthenticationConverter.convert(jwt);
            if (auth != null) {
                auth.setAuthenticated(true);
                accessor.setUser(auth);
                SecurityContextHolder.getContext().setAuthentication(auth);
                log.info("[WS-AUTH] STOMP CONNECT ok session={} sub={}", accessor.getSessionId(), jwt.getSubject());
            }
        } catch (JwtException ex) {
            log.warn("[WS-AUTH] STOMP CONNECT rejected: jwt invalid session={} reason={}",
                accessor.getSessionId(), ex.getMessage());
            throw new IllegalArgumentException("Invalid JWT on STOMP CONNECT: " + ex.getMessage(), ex);
        }
    }
}
