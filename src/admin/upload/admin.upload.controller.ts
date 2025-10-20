import { Body, Controller, Post } from '@nestjs/common';
import { CreateS3PresignedUrlsAdminDto } from 'src/dtos/admin/upload/create-presigend-urls.admin.dto';
import { AdminUploadService } from './admin.upload.service';

@Controller('admin/upload')
export class AdminUploadController {
  constructor(private readonly adminUploadService: AdminUploadService) {}

  @Post('presigned-urls')
  async getPresignedUrls(@Body() files: CreateS3PresignedUrlsAdminDto) {
    return this.adminUploadService.getPresignedUrls(files.filenames);
  }
}
