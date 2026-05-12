package pt.ua.deti.apieasyspot.billing.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import pt.ua.deti.apieasyspot.billing.dto.ManagerBillingSessionResponse;
import pt.ua.deti.apieasyspot.billing.repository.ManagerBillingRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ManagerBillingService {

    private final ManagerBillingRepository repository;

    public Page<ManagerBillingSessionResponse> listBillingSessions(UUID parkId, int days, Pageable pageable) {
        OffsetDateTime since = OffsetDateTime.now().minusDays(days);
        int page = pageable.getPageNumber();
        int size = pageable.getPageSize();

        long total = repository.countRecent(parkId, since);
        List<ManagerBillingSessionResponse> content = repository.findRecent(parkId, since, page, size);

        return new PageImpl<>(content, pageable, total);
    }
}
