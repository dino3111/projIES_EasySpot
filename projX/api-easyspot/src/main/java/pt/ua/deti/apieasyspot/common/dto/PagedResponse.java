package pt.ua.deti.apieasyspot.common.dto;

import java.util.List;
import java.util.function.Function;

public record PagedResponse<T>(
    List<T> content,
    long totalElements,
    int totalPages,
    int page,
    int size,
    boolean first,
    boolean last
) {
    public static <T> PagedResponse<T> of(List<T> content, long total, int page, int size) {
        int pages = size <= 0 ? 1 : (int) Math.ceil((double) total / size);
        return new PagedResponse<>(content, total, pages, page, size, page == 0, page >= pages - 1);
    }

    public <R> PagedResponse<R> map(Function<T, R> mapper) {
        return new PagedResponse<>(content.stream().map(mapper).toList(),
                totalElements, totalPages, page, size, first, last);
    }
}
