package pt.ua.deti.apieasyspot.billing.service;

import com.stripe.model.Customer;
import com.stripe.model.CustomerCollection;
import com.stripe.model.PaymentIntent;
import com.stripe.model.PaymentMethod;
import com.stripe.model.PaymentMethodCollection;
import com.stripe.net.RequestOptions;
import com.stripe.param.PaymentIntentCreateParams;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import pt.ua.deti.apieasyspot.billing.exception.PaymentSetupRequiredException;
import pt.ua.deti.apieasyspot.auth.model.User;
import pt.ua.deti.apieasyspot.auth.repository.UserRepository;
import pt.ua.deti.apieasyspot.billing.model.PaymentRecord;
import pt.ua.deti.apieasyspot.billing.model.PaymentStatus;
import pt.ua.deti.apieasyspot.billing.repository.PaymentRecordRepository;
import pt.ua.deti.apieasyspot.billing.repository.TimescaleParkingSessionRepository;
import pt.ua.deti.apieasyspot.booking.model.Reservation;
import pt.ua.deti.apieasyspot.booking.model.ReservationStatus;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingLot;
import pt.ua.deti.apieasyspot.occupancy.model.ParkingSpot;
import pt.ua.deti.apieasyspot.occupancy.model.ZoneType;
import pt.ua.deti.apieasyspot.vehicle.model.Vehicle;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.mockStatic;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BillingServiceTest {

    @Mock
    private TimescaleParkingSessionRepository parkingSessionRepository;

    @Mock
    private PaymentRecordRepository paymentRecordRepository;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private BillingService billingService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(billingService, "stripeSecretKey", "sk_test_123");
    }

    @Test
    @DisplayName("creates and stores a completed Stripe payment for a reservation")
    void createPaymentIntentForReservation_createsCompletedPayment() {
        Reservation reservation = reservation();
        reservation.setEstimatedCost(new BigDecimal("12.50"));
        when(userRepository.findByEmail("driver@example.com")).thenReturn(Optional.of(userWithStripeCustomerId(null)));

        Customer customer = mock(Customer.class);
        when(customer.getId()).thenReturn("cus_123");
        when(customer.getInvoiceSettings()).thenReturn(null);

        CustomerCollection customerCollection = mock(CustomerCollection.class);
        when(customerCollection.getData()).thenReturn(List.of(customer));

        PaymentMethod paymentMethod = mock(PaymentMethod.class);
        when(paymentMethod.getId()).thenReturn("pm_123");

        PaymentMethodCollection paymentMethodCollection = mock(PaymentMethodCollection.class);
        when(paymentMethodCollection.getData()).thenReturn(List.of(paymentMethod));

        PaymentIntent paymentIntent = mock(PaymentIntent.class);
        when(paymentIntent.getId()).thenReturn("pi_123");
        when(paymentIntent.getStatus()).thenReturn("succeeded");

        when(paymentRecordRepository.findTopByReservationIdOrderByCreatedAtDesc(reservation.getId()))
            .thenReturn(Optional.empty());
        when(paymentRecordRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        try (
            MockedStatic<Customer> customerStatic = mockStatic(Customer.class);
            MockedStatic<PaymentMethod> paymentMethodStatic = mockStatic(PaymentMethod.class);
            MockedStatic<PaymentIntent> paymentIntentStatic = mockStatic(PaymentIntent.class)
        ) {
            customerStatic.when(() -> Customer.list(any(com.stripe.param.CustomerListParams.class), any(RequestOptions.class)))
                .thenReturn(customerCollection);
            paymentMethodStatic.when(() -> PaymentMethod.list(any(com.stripe.param.PaymentMethodListParams.class), any(RequestOptions.class)))
                .thenReturn(paymentMethodCollection);
            paymentIntentStatic.when(() -> PaymentIntent.create(any(PaymentIntentCreateParams.class), any(RequestOptions.class)))
                .thenReturn(paymentIntent);

            String intentId = billingService.createPaymentIntentForReservation(reservation, "driver@example.com");

            assertThat(intentId).isEqualTo("pi_123");
            verify(paymentRecordRepository).save(
                org.mockito.ArgumentMatchers.argThat((PaymentRecord pr) ->
                    pr.getReservationId().equals(reservation.getId()) &&
                        pr.getPaymentIntentId().equals("pi_123") &&
                        pr.getStatus() == PaymentStatus.COMPLETED &&
                        pr.getCustomerEmail().equals("driver@example.com"))
            );
            verify(parkingSessionRepository).save(any());
        }
    }

    @Test
    @DisplayName("throws when Stripe customer has no saved payment method")
    void createPaymentIntentForReservation_requiresSavedPaymentMethod() {
        Reservation reservation = reservation();
        reservation.setEstimatedCost(new BigDecimal("12.50"));
        when(userRepository.findByEmail("driver@example.com")).thenReturn(Optional.of(userWithStripeCustomerId(null)));

        Customer customer = mock(Customer.class);
        when(customer.getId()).thenReturn("cus_123");
        when(customer.getInvoiceSettings()).thenReturn(null);

        CustomerCollection customerCollection = mock(CustomerCollection.class);
        when(customerCollection.getData()).thenReturn(List.of(customer));

        PaymentMethodCollection paymentMethodCollection = mock(PaymentMethodCollection.class);
        when(paymentMethodCollection.getData()).thenReturn(List.of());

        try (
            MockedStatic<Customer> customerStatic = mockStatic(Customer.class);
            MockedStatic<PaymentMethod> paymentMethodStatic = mockStatic(PaymentMethod.class)
        ) {
            customerStatic.when(() -> Customer.list(any(com.stripe.param.CustomerListParams.class), any(RequestOptions.class)))
                .thenReturn(customerCollection);
            paymentMethodStatic.when(() -> PaymentMethod.list(any(com.stripe.param.PaymentMethodListParams.class), any(RequestOptions.class)))
                .thenReturn(paymentMethodCollection);

            assertThatThrownBy(() -> billingService.createPaymentIntentForReservation(reservation, "driver@example.com"))
                .isInstanceOf(PaymentSetupRequiredException.class)
                .hasMessageContaining("Não foi encontrado um método de pagamento Stripe guardado para a reserva");
        }
    }

    private Reservation reservation() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("driver@example.com");

        ParkingLot lot = new ParkingLot();
        lot.setId(UUID.randomUUID());

        ParkingSpot spot = new ParkingSpot();
        spot.setId(UUID.randomUUID());
        spot.setZone(ZoneType.STANDARD);
        spot.setParkingLot(lot);

        Vehicle vehicle = new Vehicle();
        vehicle.setId(UUID.randomUUID());

        Reservation reservation = new Reservation();
        reservation.setId(UUID.randomUUID());
        reservation.setUser(user);
        reservation.setParkingLot(lot);
        reservation.setParkingSpot(spot);
        reservation.setVehicle(vehicle);
        reservation.setArrivalTime(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).plusDays(1));
        reservation.setDepartureTime(java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC).plusDays(1).plusHours(2));
        reservation.setStatus(ReservationStatus.CONFIRMED);
        reservation.setBookingCode("ES-TEST-123");
        return reservation;
    }

    private User userWithStripeCustomerId(String stripeCustomerId) {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("driver@example.com");
        user.setStripeCustomerId(stripeCustomerId);
        return user;
    }
}
