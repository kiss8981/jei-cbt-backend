import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { GetQuestionListQueryAdminDto } from 'src/dtos/admin/question/get-question-list-query.admin.dto';
import { GetUnitListQueryAdminDto } from 'src/dtos/admin/unit/get-unit-list-query.admin.dto';
import { AdminUnitService } from './admin.unit.service';
import { CreateUnitAdminDto } from 'src/dtos/admin/unit/create-unit.admin.dto';

@Controller('/admin/units')
@UseGuards(AdminAuthGuard)
export class AdminUnitController {
  constructor(private readonly adminUnitService: AdminUnitService) {}

  @Get()
  async getUnits(@Query() query: GetUnitListQueryAdminDto) {
    const { page = 1, limit = 20 } = query;
    return this.adminUnitService.getAll(page, limit, query);
  }

  @Post()
  async createUnit(@Body() body: CreateUnitAdminDto) {
    return this.adminUnitService.create(body);
  }

  @Delete('/:id')
  async deleteUnit(@Param('id') id: number) {
    return this.adminUnitService.delete(id);
  }
}
