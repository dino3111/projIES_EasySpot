package pt.ua.deti.apieasyspot.occupancy.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import pt.ua.deti.apieasyspot.occupancy.model.TariffStatus;

import java.math.BigDecimal;
import java.util.Set;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UpdateTariffRequestTest {

    private Validator validator;

    @BeforeEach
    void setUp() {
        ValidatorFactory factory = Validation.buildDefaultValidatorFactory();
        validator = factory.getValidator();
    }

    @Test
    void whenAllFieldsValid_thenNoViolations() {
        UpdateTariffRequest request = new UpdateTariffRequest(
            UUID.randomUUID(),
            new BigDecimal("1.50"),
            new BigDecimal("15.00"),
            new BigDecimal("100.00"),
            new BigDecimal("0.25"),
            TariffStatus.ACTIVE
        );

        Set<ConstraintViolation<UpdateTariffRequest>> violations = validator.validate(request);
        assertTrue(violations.isEmpty());
    }

    @Test
    void whenParkIdIsNull_thenViolation() {
        UpdateTariffRequest request = new UpdateTariffRequest(
            null,
            new BigDecimal("1.50"),
            new BigDecimal("15.00"),
            new BigDecimal("100.00"),
            new BigDecimal("0.25"),
            TariffStatus.ACTIVE
        );

        Set<ConstraintViolation<UpdateTariffRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    void whenPriceIsNegative_thenViolation() {
        UpdateTariffRequest request = new UpdateTariffRequest(
            UUID.randomUUID(),
            new BigDecimal("-1.50"),
            new BigDecimal("15.00"),
            new BigDecimal("100.00"),
            new BigDecimal("0.25"),
            TariffStatus.ACTIVE
        );

        Set<ConstraintViolation<UpdateTariffRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }

    @Test
    void whenPriceHasTooManyFractionalDigits_thenViolation() {
        UpdateTariffRequest request = new UpdateTariffRequest(
            UUID.randomUUID(),
            new BigDecimal("1.505"),
            new BigDecimal("15.00"),
            new BigDecimal("100.00"),
            new BigDecimal("0.25"),
            TariffStatus.ACTIVE
        );

        Set<ConstraintViolation<UpdateTariffRequest>> violations = validator.validate(request);
        assertFalse(violations.isEmpty());
    }
}
