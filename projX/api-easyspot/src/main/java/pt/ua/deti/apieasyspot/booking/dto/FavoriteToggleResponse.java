package pt.ua.deti.apieasyspot.booking.dto;

import java.util.UUID;

public record FavoriteToggleResponse (UUID parkId, boolean isFavorite) {

}
