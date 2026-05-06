package pt.ua.deti.apieasyspot.vehicle.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;

@Component
public class VehiclePhotoStorage {

    private static final Logger log = LoggerFactory.getLogger(VehiclePhotoStorage.class);
    private static final String DEFAULT_CONTENT_TYPE = "image/jpeg";
    private static final long MAX_PHOTO_BYTES = 2L * 1024 * 1024;

    private final R2StorageService r2StorageService;
    private final RestClient httpClient;
    private final String imageBaseUrl;

    public VehiclePhotoStorage(
        R2StorageService r2StorageService,
        @Value("${autodoc.vehicle-image-base}") String imageBaseUrl
    ) {
        this.r2StorageService = r2StorageService;
        this.httpClient = RestClient.builder().build();
        this.imageBaseUrl = imageBaseUrl;
    }

    public String mirror(String externalSourceId, String relativeOrAbsoluteUrl) {
        String absoluteUrl = resolveUrl(externalSourceId, relativeOrAbsoluteUrl);
        if (absoluteUrl == null) return null;

        try {
            byte[] bytes = httpClient.get().uri(absoluteUrl).retrieve().body(byte[].class);
            if (bytes == null || bytes.length == 0) {
                log.warn("Vehicle photo download empty url={}", absoluteUrl);
                return null;
            }
            if (bytes.length > MAX_PHOTO_BYTES) {
                log.warn("Vehicle photo exceeds size limit url={} bytes={}", absoluteUrl, bytes.length);
                return null;
            }
            String key = "vehicles/" + externalSourceId + ".jpg";
            return r2StorageService.upload(key, bytes, DEFAULT_CONTENT_TYPE);
        } catch (RestClientResponseException ex) {
            log.warn("Vehicle photo download failed url={} status={}", absoluteUrl, ex.getStatusCode());
            return null;
        } catch (Exception ex) {
            log.warn("Vehicle photo mirror unexpected error url={}", absoluteUrl, ex);
            return null;
        }
    }

    private String resolveUrl(String externalSourceId, String candidate) {
        if (candidate != null && (candidate.startsWith("http://") || candidate.startsWith("https://"))) {
            return candidate;
        }
        if (externalSourceId == null || externalSourceId.isBlank()) return null;
        return imageBaseUrl + "/" + externalSourceId + ".jpg";
    }
}
