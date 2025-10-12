import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AppUnitService } from './app.unit.service';
import { GetUnitListQueryAppDto } from 'src/dtos/app/unit/get-unit-list-query.app.dto';

@Controller('units')
export class AppUnitController {
  constructor(private readonly appUnitService: AppUnitService) {}

  @Get()
  async getAll(@Query() query: GetUnitListQueryAppDto) {
    return this.appUnitService.getAll(query.page, query.limit, query);
  }

  @Get('/:unitId')
  getById(@Param('unitId') unitId: number) {
    return this.appUnitService.getById(unitId);
  }
}
