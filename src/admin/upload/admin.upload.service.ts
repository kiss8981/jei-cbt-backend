import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as mime from 'mime-types';
import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { AwsS3ApiAdapter } from 'src/external/aws-s3/aws-s3.api.adapter';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { GetS3PresignedUrlAdminDto } from 'src/dtos/admin/upload/get-presigend-urls.admin.dto';
import { PhotoMapRepository } from 'src/repositories/photo-map-repository';
import { PhotoMappingTypeEnum } from 'src/common/constants/photo-mapping-type.enum';
import { UpdatePhotoMappingAdminDto } from 'src/dtos/admin/upload/update-photo-mapping.admin.dto';
import {
  CreateS3PresignedUrlFileAdminDto,
  CreateS3PresignedUrlsAdminDto,
} from 'src/dtos/admin/upload/create-presigend-urls.admin.dto';
import { UploadPurpose } from 'src/common/constants/upload-purpose.enum';
import { NoticeAssetRepository } from 'src/repositories/notice-asset.repository';
import {
  NoticeAssetKind,
  NoticeAssetStatus,
} from 'src/common/constants/notice-asset.enum';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_FILES_PER_REQUEST = 10;
const QUESTION_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.bmp',
  '.webp',
  '.heic',
  '.heif',
]);
const NOTICE_MIME_BY_EXTENSION: Record<string, string[]> = {
  '.jpg': ['image/jpeg'],
  '.jpeg': ['image/jpeg'],
  '.png': ['image/png'],
  '.gif': ['image/gif'],
  '.bmp': ['image/bmp'],
  '.webp': ['image/webp'],
  '.heic': ['image/heic', 'image/heif'],
  '.heif': ['image/heic', 'image/heif'],
  '.pdf': ['application/pdf'],
  '.doc': ['application/msword'],
  '.docx': [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
  '.xls': ['application/vnd.ms-excel'],
  '.xlsx': [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  '.ppt': ['application/vnd.ms-powerpoint'],
  '.pptx': [
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ],
  '.hwp': [
    'application/x-hwp',
    'application/haansofthwp',
    'application/vnd.hancom.hwp',
  ],
  '.hwpx': ['application/vnd.hancom.hwpx', 'application/zip'],
  '.txt': ['text/plain'],
  '.csv': ['text/csv', 'application/csv', 'text/plain'],
  '.zip': ['application/zip', 'application/x-zip-compressed'],
};

@Injectable()
export class AdminUploadService {
  constructor(
    private readonly awsS3ApiAdapter: AwsS3ApiAdapter,
    private readonly photoMapRepository: PhotoMapRepository,
    private readonly noticeAssetRepository: NoticeAssetRepository,
  ) {}

  async getPresignedUrls(
    body: CreateS3PresignedUrlsAdminDto,
    adminUserId: number,
  ) {
    if (!body.files.length || body.files.length > MAX_FILES_PER_REQUEST) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }

    const results: GetS3PresignedUrlAdminDto[] = [];
    for (const file of body.files) {
      this.validateFile(body.purpose, file);
      const extension = path.extname(file.fileName).toLowerCase();
      const key =
        body.purpose === UploadPurpose.QUESTION
          ? `tmp/${randomUUID()}${extension}`
          : `notices/uploads/${randomUUID()}${extension}`;
      const uploadUrl = await this.awsS3ApiAdapter.getUploadPresignedUrl(
        key,
        file.mimeType,
      );

      let uploadId: number | null;
      if (body.purpose === UploadPurpose.QUESTION) {
        const photo = await this.photoMapRepository.create({
          originalName: file.fileName,
          key,
          mimeType: file.mimeType,
          size: file.size,
        });
        uploadId = photo.id;
      } else {
        const asset = await this.noticeAssetRepository.create({
          originalName: file.fileName,
          key,
          mimeType: file.mimeType,
          size: file.size,
          kind: file.mimeType.startsWith('image/')
            ? NoticeAssetKind.IMAGE
            : NoticeAssetKind.FILE,
          status: NoticeAssetStatus.TEMP,
          adminUserId,
        });
        uploadId = asset.id;
      }

      results.push({
        uploadId,
        fileName: file.fileName,
        uploadUrl,
        key,
        publicUrl: this.awsS3ApiAdapter.getPublicUrl(key),
        mimeType: file.mimeType,
        size: file.size,
      });
    }

    return results.map((item) =>
      plainToInstance(GetS3PresignedUrlAdminDto, item, {
        excludeExtraneousValues: true,
      }),
    );
  }

  private validateFile(
    purpose: UploadPurpose,
    file: CreateS3PresignedUrlFileAdminDto,
  ) {
    if (file.size > MAX_FILE_SIZE) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }
    const extension = path.extname(file.fileName).toLowerCase();
    if (!extension || !mime.lookup(file.fileName)) {
      throw new CustomHttpException(ErrorCodes.S3_UNSUPPORTED_FILE_TYPE);
    }
    if (purpose === UploadPurpose.QUESTION) {
      if (
        !QUESTION_EXTENSIONS.has(extension) ||
        !file.mimeType.startsWith('image/')
      ) {
        throw new CustomHttpException(ErrorCodes.S3_UNSUPPORTED_FILE_TYPE);
      }
      return;
    }
    if (
      !NOTICE_MIME_BY_EXTENSION[extension]?.includes(
        file.mimeType.toLowerCase(),
      )
    ) {
      throw new CustomHttpException(ErrorCodes.S3_UNSUPPORTED_FILE_TYPE);
    }
  }

  async photoMappingMany(
    mappingType: PhotoMappingTypeEnum,
    mappingItemId: number,
    photos: UpdatePhotoMappingAdminDto[],
  ) {
    const mappingKeyPrefix = `${mappingType.toLowerCase()}/${mappingItemId}/`;
    for (const photo of photos) {
      if (photo.key.startsWith('tmp/')) {
        const newKey = mappingKeyPrefix + photo.key.replace('tmp/', '');
        await this.awsS3ApiAdapter.copyObject(photo.key, newKey);
        await this.photoMapRepository.updateByKey(photo.key, {
          key: newKey,
          orderIndex: photo.orderIndex,
          questionId: mappingItemId,
        });
        await this.awsS3ApiAdapter.deleteObject(photo.key);
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
}
