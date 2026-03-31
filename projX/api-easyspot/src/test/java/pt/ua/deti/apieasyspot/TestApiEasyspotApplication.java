package pt.ua.deti.apieasyspot;

import org.springframework.boot.SpringApplication;

public class TestApiEasyspotApplication {

    public static void main(String[] args) {
        SpringApplication.from(ApiEasyspotApplication::main).with(TestcontainersConfiguration.class).run(args);
    }

}
