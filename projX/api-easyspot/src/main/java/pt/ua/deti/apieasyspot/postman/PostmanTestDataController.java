package pt.ua.deti.apieasyspot.postman;

import org.springframework.context.annotation.Profile;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@Profile("postman")
@RequestMapping("/api/test")
class PostmanTestDataController {

    private final PostmanDataInitializer initializer;

    PostmanTestDataController(PostmanDataInitializer initializer) {
        this.initializer = initializer;
    }

    @GetMapping("/seed")
    Map<String, String> getSeedData() {
        return Map.of(
            "vehicleId", initializer.getVehicleId().toString(),
            "parkId", initializer.getParkId().toString()
        );
    }
}