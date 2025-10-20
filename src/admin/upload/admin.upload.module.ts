import { Module } from '@nestjs/common';
import { AdminUploadService } from './admin.upload.service';
import { AdminUploadController } from './admin.upload.controller';
import { AdminAuthModule } from '../auth/admin.auth.module';
import { AwsS3Module } from 'src/external/aws-s3/aws-s3.module';
import { PhotoMapRepository } from 'src/repositories/photo-map-repository';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PhotoMap } from 'src/entities/photo-map.entity';

@Module({
  imports: [AdminAuthModule, AwsS3Module, TypeOrmModule.forFeature([PhotoMap])],
  controllers: [AdminUploadController],
  providers: [AdminUploadService, PhotoMapRepository],
  exports: [AdminUploadService],
})
export class AdminUploadModule {}
