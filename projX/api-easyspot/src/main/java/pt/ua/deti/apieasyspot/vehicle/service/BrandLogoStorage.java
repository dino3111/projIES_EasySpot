package pt.ua.deti.apieasyspot.vehicle.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import pt.ua.deti.apieasyspot.infrastructure.R2StorageService;

import java.util.Map;

@Component
public class BrandLogoStorage {

    private static final Logger log = LoggerFactory.getLogger(BrandLogoStorage.class);
    private static final String CDN = "https://raw.githubusercontent.com/filippofilip95/car-logos-dataset/master/logos/optimized";
    private static final String CONTENT_TYPE = "image/png";
    private static final long MAX_BYTES = 512L * 1024;

    private static final Map<String, String> BRAND_SLUGS = Map.ofEntries(
        Map.entry("audi", "audi"),
        Map.entry("bmw", "bmw"),
        Map.entry("citroen", "citroen"),
        Map.entry("citroën", "citroen"),
        Map.entry("dacia", "dacia"),
        Map.entry("fiat", "fiat"),
        Map.entry("ford", "ford"),
        Map.entry("honda", "honda"),
        Map.entry("hyundai", "hyundai"),
        Map.entry("jaguar", "jaguar"),
        Map.entry("jeep", "jeep"),
        Map.entry("kia", "kia"),
        Map.entry("lexus", "lexus"),
        Map.entry("mazda", "mazda"),
        Map.entry("mercedes", "mercedes-benz"),
        Map.entry("mercedes-benz", "mercedes-benz"),
        Map.entry("mini", "mini"),
        Map.entry("mitsubishi", "mitsubishi"),
        Map.entry("nissan", "nissan"),
        Map.entry("opel", "opel"),
        Map.entry("peugeot", "peugeot"),
        Map.entry("porsche", "porsche"),
        Map.entry("renault", "renault"),
        Map.entry("seat", "seat"),
        Map.entry("skoda", "skoda"),
        Map.entry("škoda", "skoda"),
        Map.entry("subaru", "subaru"),
        Map.entry("suzuki", "suzuki"),
        Map.entry("tesla", "tesla"),
        Map.entry("toyota", "toyota"),
        Map.entry("volkswagen", "volkswagen"),
        Map.entry("vw", "volkswagen"),
        Map.entry("volvo", "volvo"),
        Map.entry("alfa romeo", "alfa-romeo"),
        Map.entry("land rover", "land-rover"),
        Map.entry("chevrolet", "chevrolet"),
        Map.entry("lamborghini", "lamborghini"),
        Map.entry("maserati", "maserati"),
        Map.entry("infiniti", "infiniti")
    );

    private final R2StorageService r2StorageService;
    private final RestClient httpClient;

    public BrandLogoStorage(R2StorageService r2StorageService) {
        this.r2StorageService = r2StorageService;
        this.httpClient = RestClient.builder().build();
    }

    public String mirror(String make) {
        if (make == null || make.isBlank()) return null;
        String slug = BRAND_SLUGS.get(make.toLowerCase().trim());
        if (slug == null) return null;

        String key = "brand-logos/" + slug + ".png";
        String cdnUrl = CDN + "/" + slug + ".png";

        try {
            byte[] bytes = httpClient.get().uri(cdnUrl).retrieve().body(byte[].class);
            if (bytes == null || bytes.length == 0) {
                log.warn("Brand logo empty make={} url={}", make, cdnUrl);
                return null;
            }
            if (bytes.length > MAX_BYTES) {
                log.warn("Brand logo exceeds size limit make={} bytes={}", make, bytes.length);
                return null;
            }
            return r2StorageService.upload(key, bytes, CONTENT_TYPE);
        } catch (RestClientResponseException ex) {
            log.warn("Brand logo download failed make={} status={}", make, ex.getStatusCode());
            return null;
        } catch (Exception ex) {
            log.warn("Brand logo mirror unexpected error make={}", make, ex);
            return null;
        }
    }
}
