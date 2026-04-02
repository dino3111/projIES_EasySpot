package pt.ua.deti.apieasyspot.postman;

import lombok.Getter;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;
import pt.ua.deti.apieasyspot.vehicle.repository.VehicleRepository;

import java.util.UUID;

@Component
@Profile("postman")
class PostmanDataInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;

    @Getter
    private UUID vehicleId;

    PostmanDataInitializer(UserRepository userRepository, VehicleRepository vehicleRepository) {
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        User user = new User();
        user.setAuthentikUserId("auth-sub-postman-driver");
        user.setEmail("postman@easyspot.test");
        user.setName("Postman Driver");
        user.setRole("DRIVER");
        user = userRepository.save(user);

        Vehicle vehicle = new Vehicle();
        vehicle.setUser(user);
        vehicle.setPlate("AA-00-AA");
        vehicle.setMake("Opel");
        vehicle.setModel("Corsa");
        vehicle.setFuelType("Gasolina");
        vehicle.setYear(2021);
        vehicle = vehicleRepository.save(vehicle);

        vehicleId = vehicle.getId();
    }
}