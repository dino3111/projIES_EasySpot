package pt.ua.deti.apieasyspot.common.config;

import javax.sql.DataSource;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

@Configuration
public class TimescaleDataSourceConfig {

    @Bean(name = "timescaleDataSource")
    public DataSource timescaleDataSource(
        @Value("${timescale.datasource.url}") String url,
        @Value("${timescale.datasource.username}") String username,
        @Value("${timescale.datasource.password}") String password
    ) {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.postgresql.Driver");
        dataSource.setUrl(url);
        dataSource.setUsername(username);
        dataSource.setPassword(password);
        return dataSource;
    }

    @Bean(name = "timescaleJdbcTemplate")
    public JdbcTemplate timescaleJdbcTemplate(@Qualifier("timescaleDataSource") DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean(name = "timescaleNamedJdbcTemplate")
    public NamedParameterJdbcTemplate timescaleNamedJdbcTemplate(
        @Qualifier("timescaleDataSource") DataSource dataSource
    ) {
        return new NamedParameterJdbcTemplate(dataSource);
    }
}
