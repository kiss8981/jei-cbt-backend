import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { GetNoticeListQueryAdminDto } from 'src/dtos/admin/notice/get-notice-list-query.admin.dto';
import { NoticeService } from './notice.service';

@Controller('notices')
@UseGuards(AuthGuard)
export class AppNoticeController {
  constructor(private readonly service: NoticeService) {}

  @Get()
  list(@Query() query: GetNoticeListQueryAdminDto) {
    return this.service.getPublicList(
      Math.max(Number(query.page ?? 1), 1),
      Math.min(Math.max(Number(query.limit ?? 20), 1), 100),
      query.keyword?.trim() || undefined,
    );
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.service.getOne(id, true);
  }
}
