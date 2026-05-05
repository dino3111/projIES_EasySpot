package pt.ua.deti.apieasyspot.auth;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;

import java.util.List;

@Component
public class CustomJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {
    private final JwtAuthenticationConverter defaultConverter;
    private final UserRepository userRepository;

    public CustomJwtAuthenticationConverter(UserRepository userRepository) {
        this.userRepository = userRepository;
        JwtGrantedAuthoritiesConverter authoritiesConverter = new JwtGrantedAuthoritiesConverter();
        authoritiesConverter.setAuthoritiesClaimName("groups");
        authoritiesConverter.setAuthorityPrefix("ROLE_");

        this.defaultConverter = new JwtAuthenticationConverter();
        this.defaultConverter.setJwtGrantedAuthoritiesConverter(authoritiesConverter);
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        syncUser(jwt);
        return defaultConverter.convert(jwt);
    }

    private void syncUser(Jwt jwt) {
        String subject = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        List<String> groups = jwt.getClaimAsStringList("groups");
        String role = (groups != null && !groups.isEmpty()) ? groups.get(0) : "DRIVER";

        User user = userRepository.findByAuthentikUserId(subject).orElseGet(User::new);
        boolean changed = false;

        if (user.getAuthentikUserId() == null) {
            user.setAuthentikUserId(subject);
            changed = true;
        }
        if (email != null && !email.equals(user.getEmail())) {
            user.setEmail(email);
            changed = true;
        }
        if (name != null && !name.equals(user.getName())) {
            user.setName(name);
            changed = true;
        }
        if (user.getRole() == null) {
            user.setRole(role);
            changed = true;
        }

        if (changed) {
            userRepository.save(user);
        }
    }
}
