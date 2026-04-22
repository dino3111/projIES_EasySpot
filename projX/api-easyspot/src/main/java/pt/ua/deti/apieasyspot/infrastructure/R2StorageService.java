package pt.ua.deti.apieasyspot.infrastructure;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;

@Service
public class R2StorageService {

    private final S3Client s3Client;
    private final String bucketName;
    private final String publicBaseUrl;

    public R2StorageService(
        @Value("${r2.account-id}") String accountId,
        @Value("${r2.access-key}") String accessKey,
        @Value("${r2.secret-key}") String secretKey,
        @Value("${r2.bucket}") String bucketName,
        @Value("${r2.public-url}") String publicBaseUrl
    ) {
        this.bucketName = bucketName;
        this.publicBaseUrl = publicBaseUrl;
        this.s3Client = S3Client.builder()
            .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
            .region(Region.of("auto"))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)
            ))
            .build();
    }

    public String upload(String key, byte[] data, String contentType) {
        s3Client.putObject(
            PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .contentType(contentType)
                .contentLength((long) data.length)
                .build(),
            RequestBody.fromBytes(data)
        );
        return publicBaseUrl + "/" + key;
    }
}
