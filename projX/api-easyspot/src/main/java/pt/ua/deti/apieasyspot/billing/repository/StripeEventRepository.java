package pt.ua.deti.apieasyspot.billing.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pt.ua.deti.apieasyspot.billing.model.StripeEvent;

@Repository
public interface StripeEventRepository extends JpaRepository<StripeEvent, String> {
}
