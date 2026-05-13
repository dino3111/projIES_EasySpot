package pt.ua.deti.apieasyspot.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@Order(Ordered.LOWEST_PRECEDENCE)
public class RequestDebugFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
        throws ServletException, IOException {
        long start = System.currentTimeMillis();
        String method = request.getMethod();
        String path = request.getRequestURI();
        String query = request.getQueryString();
        String authHeader = request.getHeader("Authorization");
        String bearer = authHeader != null && authHeader.startsWith("Bearer ") ? "yes" : "no";
        String origin = request.getHeader("Origin");

        try {
            chain.doFilter(request, response);
        } finally {
            int status = response.getStatus();
            long ms = System.currentTimeMillis() - start;
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String principal = auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())
                ? auth.getName() : "anonymous";
            String authorities = auth != null ? auth.getAuthorities().toString() : "[]";
            if (status >= 400) {
                log.warn("[REQ] {} {}{} status={} time={}ms bearer={} principal={} authorities={} origin={}",
                    method, path, query != null ? "?" + query : "", status, ms, bearer, principal, authorities, origin);
            } else {
                log.debug("[REQ] {} {} status={} time={}ms principal={}", method, path, status, ms, principal);
            }
        }
    }
}
