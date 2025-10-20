import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { ErrorCodes } from 'src/common/constants/error-code.enum';

@Injectable()
export class AwsS3ApiAdapter {
  private readonly logger = new Logger(AwsS3ApiAdapter.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly defaultExpiresInSeconds = 60 * 15;

  constructor(private readonly configService: ConfigService) {
    const region = `ap-northeast-2`; // 서울 리전
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_ACCESS_SECRET_KEY',
    );
    this.bucketName = this.configService.get<string>('AWS_BUCKET_NAME');

    if (!region || !accessKeyId || !secretAccessKey || !this.bucketName) {
      this.logger.error(
        'AWS S3 configuration is missing. Check environment variables.',
      );
      throw new Error('AWS S3 configuration is missing.');
    }

    this.s3Client = new S3Client({
      region: region,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  /**
   * 객체 다운로드(GET)를 위한 Presigned URL을 생성합니다.
   * @param key S3 객체의 키 (경로/파일명)
   * @param expiresInSeconds URL의 유효 시간 (초)
   * @returns 생성된 Presigned URL
   */
  async getDownloadPresignedUrl(
    key: string,
    expiresInSeconds: number = this.defaultExpiresInSeconds,
  ): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        // Content-Disposition 헤더를 추가하여 다운로드 시 파일명을 지정할 수도 있습니다.
        // ResponseContentDisposition: `attachment; filename="${encodeURIComponent(key.split('/').pop())}"`,
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate download presigned URL for key: ${key}`,
        error.stack,
      );
      throw new InternalServerErrorException('Failed to generate download URL');
    }
  }

  async getObject(key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new CustomHttpException(ErrorCodes.S3_FILE_GET_ERROR);
      }

      const bytes = await response.Body.transformToByteArray(); // Uint8Array
      const base64 = Buffer.from(bytes).toString('base64');

      return base64;
    } catch (error) {
      this.logger.error(`Failed to get object with key: ${key}`, error.stack);
      throw new CustomHttpException(ErrorCodes.S3_FILE_GET_ERROR);
    }
  }

  async copyObject(sourceKey: string, destinationKey: string) {
    try {
      await this.s3Client.send(
        new CopyObjectCommand({
          Bucket: this.bucketName,
          CopySource: `${this.bucketName}/${sourceKey}`,
          Key: destinationKey,
          ACL: 'public-read',
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to copy object from ${sourceKey} to ${destinationKey}`,
        error.stack,
      );
      throw new CustomHttpException(ErrorCodes.S3_FILE_COPY_ERROR);
    }
  }

  async deleteObject(key: string) {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to delete object with key: ${key}`,
        error.stack,
      );
      throw new CustomHttpException(ErrorCodes.S3_FILE_DELETE_ERROR);
    }
  }

  /**
   * 객체 업로드(PUT)를 위한 Presigned URL을 생성합니다.
   * 이 URL은 클라이언트에서 파일을 직접 S3로 PUT 요청할 때 사용됩니다.
   * @param key S3 객체의 키 (경로/파일명)
   * @param contentType 업로드할 파일의 Content-Type (예: 'image/jpeg', 'application/pdf')
   * @param expiresInSeconds URL의 유효 시간 (초)
   * @returns 생성된 Presigned URL
   */
  async getUploadPresignedUrl(
    key: string,
    contentType: string,
    expiresInSeconds: number = this.defaultExpiresInSeconds,
  ): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read',
      });

      const url = await getSignedUrl(this.s3Client, command, {
        expiresIn: expiresInSeconds,
      });

      return url;
    } catch (error) {
      this.logger.error(
        `Failed to generate upload presigned URL for key: ${key}`,
        error.stack,
      );
      throw new CustomHttpException(ErrorCodes.S3_PRESIGNED_URL_ERROR);
    }
  }

  public isTemporaryUploadKey(key: string): boolean {
    return key.startsWith('tmp/');
  }
}
