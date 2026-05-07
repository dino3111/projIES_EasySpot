package pt.ua.deti.apieasyspot.booking.dto;

import java.util.UUID;

public record FavoriteStatusResponse(UUID parkId, boolean isFavorite) {
}
