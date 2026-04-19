package pt.ua.deti.apieasyspot.notification.dto;

import pt.ua.deti.apieasyspot.notification.model.SummaryFrequency;

public record AlertScheduleRequest(
    SummaryFrequency frequency,
    String time,
    String timezone
) {}
