import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  AdminUser,
  AdminUserPayload,
} from 'src/common/decorators/admin-user.decorator';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { GetNoticeListQueryAdminDto } from 'src/dtos/admin/notice/get-notice-list-query.admin.dto';
import { WriteNoticeAdminDto } from 'src/dtos/admin/notice/write-notice.admin.dto';
import { NoticeService } from './notice.service';

@Controller('admin/notices')
@UseGuards(AdminAuthGuard)
export class AdminNoticeController {
  constructor(private readonly service: NoticeService) {}

  @Get()
  list(@Query() query: GetNoticeListQueryAdminDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    return this.service.getAdminList(page, limit, {
      keyword: query.keyword?.trim() || undefined,
      isPublished:
        query.isPublished === undefined
          ? undefined
          : query.isPublished === 'true',
    });
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id);
  }

  @Post()
  create(
    @Body() body: WriteNoticeAdminDto,
    @AdminUser() admin: AdminUserPayload,
  ) {
    return this.service.create(body, admin.sub);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: WriteNoticeAdminDto,
    @AdminUser() admin: AdminUserPayload,
  ) {
    return this.service.update(id, body, admin.sub);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.service.delete(id);
  }
}
