package pt.ua.deti.apieasyspot.billing.exception;

public class PaymentSetupRequiredException extends RuntimeException {

    public PaymentSetupRequiredException(String message) {
        super(message);
    }
}
