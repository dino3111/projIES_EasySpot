package pt.ua.deti.apieasyspot;

import javax.sql.DataSource;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@TestConfiguration(proxyBeanMethods = false)
public class TestcontainersConfiguration {

    @Bean
    @ServiceConnection
    PostgreSQLContainer<?> postgresContainer() {
        return new PostgreSQLContainer<>(
            DockerImageName.parse("timescale/timescaledb:latest-pg16")
                .asCompatibleSubstituteFor("postgres"));
    }

    @Bean(name = "timescaleDataSource")
    @Primary
    DataSource timescaleDataSource(PostgreSQLContainer<?> postgresContainer) {
        DriverManagerDataSource ds = new DriverManagerDataSource();
        ds.setDriverClassName("org.postgresql.Driver");
        ds.setUrl(postgresContainer.getJdbcUrl());
        ds.setUsername(postgresContainer.getUsername());
        ds.setPassword(postgresContainer.getPassword());
        return ds;
    }

    @Bean(name = "timescaleJdbcTemplate")
    JdbcTemplate timescaleJdbcTemplate(
        @org.springframework.beans.factory.annotation.Qualifier("timescaleDataSource") DataSource ds
    ) {
        return new JdbcTemplate(ds);
    }

    @Bean(name = "timescaleNamedJdbcTemplate")
    NamedParameterJdbcTemplate timescaleNamedJdbcTemplate(
        @org.springframework.beans.factory.annotation.Qualifier("timescaleDataSource") DataSource ds
    ) {
        return new NamedParameterJdbcTemplate(ds);
    }
}
