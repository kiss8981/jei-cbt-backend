import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminAuthModule } from 'src/admin/auth/admin.auth.module';
import { AppAuthModule } from 'src/app/auth/app.auth.module';
import { Notice } from 'src/entities/notice.entity';
import { NoticeAsset } from 'src/entities/notice-asset.entity';
import { AwsS3Module } from 'src/external/aws-s3/aws-s3.module';
import { NoticeAssetRepository } from 'src/repositories/notice-asset.repository';
import { NoticeRepository } from 'src/repositories/notice.repository';
import { AdminNoticeController } from './admin.notice.controller';
import { AppNoticeController } from './app.notice.controller';
import { NoticeService } from './notice.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notice, NoticeAsset]),
    AdminAuthModule,
    AppAuthModule,
    AwsS3Module,
  ],
  controllers: [AdminNoticeController, AppNoticeController],
  providers: [NoticeService, NoticeRepository, NoticeAssetRepository],
})
export class NoticeModule {}
