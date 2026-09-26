import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { GetUserListQueryAdminDto } from 'src/dtos/admin/user/get-user-list-query.admin.dto';
import { AdminUserService } from './admin.user.service';

@Controller('/admin/users')
@UseGuards(AdminAuthGuard)
export class AdminUserController {
  constructor(private readonly adminUserService: AdminUserService) {}

  @Get()
  getUsers(@Query() query: GetUserListQueryAdminDto) {
    return this.adminUserService.getAll(query.page, query.limit, query);
  }
}
