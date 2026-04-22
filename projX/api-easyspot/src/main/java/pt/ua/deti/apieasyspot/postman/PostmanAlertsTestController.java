package pt.ua.deti.apieasyspot.postman;

import org.springframework.context.annotation.Profile;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import pt.ua.deti.apieasyspot.notification.dto.AlertTriggerEvent;
import pt.ua.deti.apieasyspot.notification.service.AlertNotificationDispatchService;
import pt.ua.deti.apieasyspot.notification.service.AlertSummarySchedulerService;

import java.time.Instant;
import java.util.Map;

@RestController
@Profile("postman")
@RequestMapping("/api/test/alerts")
class PostmanAlertsTestController {

    private final AlertNotificationDispatchService dispatchService;
    private final AlertSummarySchedulerService summarySchedulerService;

    PostmanAlertsTestController(
        AlertNotificationDispatchService dispatchService,
        AlertSummarySchedulerService summarySchedulerService
    ) {
        this.dispatchService = dispatchService;
        this.summarySchedulerService = summarySchedulerService;
    }

    @PostMapping("/trigger")
    Map<String, Object> trigger(@RequestBody AlertTriggerEvent event) {
        int delivered = dispatchService.handleEvent(event);
        return Map.of("delivered", delivered);
    }

    @PostMapping("/summaries/run")
    Map<String, Object> runSummaries(
        @RequestParam(value = "at", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) Instant at
    ) {
        Instant now = at != null ? at : Instant.now();
        int sent = summarySchedulerService.runDueSummaries(now);
        return Map.of("sent", sent);
    }
}
