import { Module } from '@nestjs/common';
import { AdminUploadService } from './admin.upload.service';
import { AdminUploadController } from './admin.upload.controller';
import { AdminAuthModule } from '../auth/admin.auth.module';
import { AwsS3Module } from 'src/external/aws-s3/aws-s3.module';
import { PhotoMapRepository } from 'src/repositories/photo-map-repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoMap } from 'src/entities/photo-map.entity';
import { NoticeAsset } from 'src/entities/notice-asset.entity';
import { NoticeAssetRepository } from 'src/repositories/notice-asset.repository';

@Module({
  imports: [
    AdminAuthModule,
    AwsS3Module,
    TypeOrmModule.forFeature([PhotoMap, NoticeAsset]),
  ],
  controllers: [AdminUploadController],
  providers: [AdminUploadService, PhotoMapRepository, NoticeAssetRepository],
  exports: [AdminUploadService],
})
export class AdminUploadModule {}
