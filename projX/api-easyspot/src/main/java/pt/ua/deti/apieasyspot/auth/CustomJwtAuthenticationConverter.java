package pt.ua.deti.apieasyspot.auth;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;

import java.util.Collection;
import java.util.List;

@Component
public class CustomJwtAuthenticationConverter implements Converter<Jwt, AbstractAuthenticationToken> {

    private final UserRepository userRepository;

    public CustomJwtAuthenticationConverter(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public AbstractAuthenticationToken convert(Jwt jwt) {
        syncUser(jwt);
        Collection<GrantedAuthority> authorities = extractAuthorities(jwt);
        return new JwtAuthenticationToken(jwt, authorities, jwt.getSubject());
    }

    private Collection<GrantedAuthority> extractAuthorities(Jwt jwt) {
        List<String> groups = jwt.getClaimAsStringList("groups");
        if (groups == null || groups.isEmpty()) return List.of();
        return groups.stream()
            .map(g -> g.replaceAll("^/+", "").toUpperCase())
            .map(g -> new SimpleGrantedAuthority("ROLE_" + g))
            .map(a -> (GrantedAuthority) a)
            .toList();
    }

    private void syncUser(Jwt jwt) {
        String subject = jwt.getSubject();
        String email = jwt.getClaimAsString("email");
        String name = jwt.getClaimAsString("name");
        List<String> groups = jwt.getClaimAsStringList("groups");
        String role = (groups != null && !groups.isEmpty())
            ? groups.get(0).replaceAll("^/+", "").toUpperCase()
            : "DRIVER";

        var existing = userRepository.findByAuthentikUserId(subject);
        if (existing.isEmpty() && (email == null || name == null)) {
            return;
        }

        User user = existing.orElseGet(User::new);
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
