package pt.ua.deti.apieasyspot.common.exception;

public class PlateNotFoundException extends ExternalServiceException {
    public PlateNotFoundException(String message) {
        super(message);
    }

    public PlateNotFoundException(String message, Throwable cause) {
        super(message, cause);
    }
}
