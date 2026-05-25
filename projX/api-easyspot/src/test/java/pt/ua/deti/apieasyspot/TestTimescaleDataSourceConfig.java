package pt.ua.deti.apieasyspot;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

import javax.sql.DataSource;

@TestConfiguration
@Profile("test")
public class TestTimescaleDataSourceConfig {

    @Primary
    @Bean(name = "jdbcTemplate")
    @ConditionalOnMissingBean(name = "jdbcTemplate")
    public JdbcTemplate jdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean(name = "namedParameterJdbcTemplate")
    @ConditionalOnMissingBean(name = "namedParameterJdbcTemplate")
    public NamedParameterJdbcTemplate namedParameterJdbcTemplate(DataSource dataSource) {
        return new NamedParameterJdbcTemplate(dataSource);
    }

    @Bean(name = "timescaleJdbcTemplate")
    @ConditionalOnMissingBean(name = "timescaleJdbcTemplate")
    public JdbcTemplate timescaleJdbcTemplate(DataSource dataSource) {
        return new JdbcTemplate(dataSource);
    }

    @Bean(name = "timescaleNamedJdbcTemplate")
    @ConditionalOnMissingBean(name = "timescaleNamedJdbcTemplate")
    public NamedParameterJdbcTemplate timescaleNamedJdbcTemplate(DataSource dataSource) {
        return new NamedParameterJdbcTemplate(dataSource);
    }
}
