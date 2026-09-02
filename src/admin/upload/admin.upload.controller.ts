import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CreateS3PresignedUrlsAdminDto } from 'src/dtos/admin/upload/create-presigend-urls.admin.dto';
import { AdminUploadService } from './admin.upload.service';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import {
  AdminUser,
  AdminUserPayload,
} from 'src/common/decorators/admin-user.decorator';

@Controller('admin/upload')
@UseGuards(AdminAuthGuard)
export class AdminUploadController {
  constructor(private readonly adminUploadService: AdminUploadService) {}

  @Post('presigned-urls')
  async getPresignedUrls(
    @Body() body: CreateS3PresignedUrlsAdminDto,
    @AdminUser() admin: AdminUserPayload,
  ) {
    return this.adminUploadService.getPresignedUrls(body, admin.sub);
  }
}
