package pt.ua.deti.apieasyspot.occupancy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pt.ua.deti.apieasyspot.occupancy.model.TariffAudit;

import java.util.UUID;

public interface TariffAuditRepository extends JpaRepository<TariffAudit, UUID> {
}
