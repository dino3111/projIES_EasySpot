package pt.ua.deti.apieasyspot.billing.dto;

public enum SpendingTimeWindow {
    DAYS_7,
    DAYS_30,
    MONTHS_3,
    MONTHS_6,
    MONTHS_12;

    public static SpendingTimeWindow fromParam(String raw) {
        return switch (raw) {
            case "7D" -> DAYS_7;
            case "30D" -> DAYS_30;
            case "3M" -> MONTHS_3;
            case "6M" -> MONTHS_6;
            case "12M" -> MONTHS_12;
            default -> throw new IllegalArgumentException("Invalid timeWindow: " + raw);
        };
    }
}
