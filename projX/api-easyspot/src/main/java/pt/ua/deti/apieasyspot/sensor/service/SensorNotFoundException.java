package pt.ua.deti.apieasyspot.sensor.service;

public class SensorNotFoundException extends RuntimeException {
    public SensorNotFoundException(String sensorId) {
        super("Sensor not found: " + sensorId);
    }
}
