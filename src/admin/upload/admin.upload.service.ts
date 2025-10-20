import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as mime from 'mime-types';
import { AwsS3ApiAdapter } from 'src/external/aws-s3/aws-s3.api.adapter';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { plainToInstance } from 'class-transformer';
import { GetS3PresignedUrlAdminDto } from 'src/dtos/admin/upload/get-presigend-urls.admin.dto';
import { PhotoMapRepository } from 'src/repositories/photo-map-repository';
import { PhotoMappingTypeEnum } from 'src/common/constants/photo-mapping-type.enum';
import { UpdatePhotoMappingAdminDto } from 'src/dtos/admin/upload/update-photo-mapping.admin.dto';

@Injectable()
export class AdminUploadService {
  private readonly S3_UPLOAD_BASE_PATH = 'tmp/';

  constructor(
    private readonly awsS3ApiAdapter: AwsS3ApiAdapter,
    private readonly photoMapRepository: PhotoMapRepository,
  ) {}

  async getPresignedUrls(filenames: string[]) {
    const results: GetS3PresignedUrlAdminDto[] = [];

    for (const fileName of filenames) {
      try {
        const contentType = mime.lookup(fileName);

        if (!contentType)
          throw new CustomHttpException(ErrorCodes.S3_UNSUPPORTED_FILE_TYPE);

        const fileExtension = path.extname(fileName);
        const s3Key = `${this.S3_UPLOAD_BASE_PATH}${Date.now()}${fileExtension}`;

        const uploadUrl = await this.awsS3ApiAdapter.getUploadPresignedUrl(
          s3Key,
          contentType,
        );

        await this.photoMapRepository.create({
          originalName: fileName,
          key: s3Key,
          mimeType: contentType,
        });

        results.push({
          fileName,
          uploadUrl,
          key: s3Key,
        });
      } catch (error) {
        if (error instanceof CustomHttpException) throw error;
        else
          throw new CustomHttpException({
            ...ErrorCodes.S3_PRESIGNED_URL_ERROR,
            message:
              error?.message || ErrorCodes.S3_PRESIGNED_URL_ERROR.message,
          });
      }
    }

    return results.map((item) =>
      plainToInstance(GetS3PresignedUrlAdminDto, item, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async photoMappingMany(
    mappingType: PhotoMappingTypeEnum,
    mappingItemId: number,
    photos: UpdatePhotoMappingAdminDto[],
  ) {
    const mappingKeyPrefix = this.photoMappingKeyGenerate(
      mappingType,
      mappingItemId,
    );

    for (const photo of photos) {
      if (photo.key.startsWith('tmp/')) {
        const newKey = mappingKeyPrefix + photo.key.replace('tmp/', '');
        await this.awsS3ApiAdapter.copyObject(photo.key, newKey);

        await this.photoMapRepository.updateByKey(photo.key, {
          key: newKey,
          orderIndex: photo.orderIndex,
          ...{
            [this.photoMappingJoinColumnSelector(mappingType)]: mappingItemId,
          },
        });
      } else if (photo.delete) {
        await this.awsS3ApiAdapter.deleteObject(photo.key);
        await this.photoMapRepository.deleteByKey(photo.key);
      } else {
        await this.photoMapRepository.updateByKey(photo.key, {
          orderIndex: photo.orderIndex,
        });
      }
    }
  }

  private photoMappingKeyGenerate(
    mappingType: PhotoMappingTypeEnum,
    mappingItemId: number,
  ): string {
    return `${mappingType.toLowerCase()}/${mappingItemId}/`;
  }

  private photoMappingJoinColumnSelector(
    mappingType: PhotoMappingTypeEnum,
  ): string {
    switch (mappingType) {
      case PhotoMappingTypeEnum.QUESTION:
        return 'questionId';
      default:
        throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }
  }
}
