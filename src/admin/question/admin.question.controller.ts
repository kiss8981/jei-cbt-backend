import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { CreateQuestionAdminDto } from 'src/dtos/admin/question/create-question.admin.dto';
import { ExportQuestionListQueryAdminDto } from 'src/dtos/admin/question/export-question-list-query.admin.dto';
import { GetQuestionListQueryAdminDto } from 'src/dtos/admin/question/get-question-list-query.admin.dto';
import { AdminQuestionService } from './admin.question.service';
import { AdminQuestionExcelService } from './admin.question-excel.service';
import { UpdateQuestionAdminDto } from 'src/dtos/admin/question/update-question.admin.dto';
import {
  UpdatePhotoMappingAdminDto,
  UpdatePhotoMappingsAdminDto,
} from 'src/dtos/admin/upload/update-photo-mapping.admin.dto';
import { AdminUploadService } from '../upload/admin.upload.service';
import { PhotoMappingTypeEnum } from 'src/common/constants/photo-mapping-type.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { Response } from 'express';
import { CommitQuestionExcelAdminDto } from 'src/dtos/admin/question/commit-question-excel.admin.dto';

@Controller('/admin/questions')
@UseGuards(AdminAuthGuard)
export class AdminQuestionController {
  constructor(
    private readonly adminQuestionService: AdminQuestionService,
    private readonly adminQuestionExcelService: AdminQuestionExcelService,
    private readonly adminUploadService: AdminUploadService,
  ) {}

  @Get()
  async getQuestions(@Query() query: GetQuestionListQueryAdminDto) {
    return this.adminQuestionService.getAll(query.page, query.limit, query);
  }

  @Get('/excel/template')
  async downloadQuestionTemplate(@Res() res: Response) {
    const buffer = this.adminQuestionExcelService.getTemplateBuffer();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="question-template.xlsx"',
    );
    res.send(buffer);
  }

  @Get('/excel/export')
  async exportQuestionsExcel(
    @Query() query: ExportQuestionListQueryAdminDto,
    @Res() res: Response,
  ) {
    const buffer = await this.adminQuestionExcelService.getExportBuffer({
      keyword: query.keyword,
      unitIds: query.unitIds,
      questionTypes: query.questionTypes,
    });
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="question-export.xlsx"',
    );
    res.send(buffer);
  }

  @Post('/excel/preview')
  @UseInterceptors(FileInterceptor('file'))
  async previewQuestionsFromExcel(@UploadedFile() file: any) {
    return this.adminQuestionExcelService.preview(file.buffer);
  }

  @Post('/excel/commit')
  async commitQuestionsFromExcel(@Body() body: CommitQuestionExcelAdminDto) {
    return this.adminQuestionExcelService.commit(body);
  }

  @Get(':questionId')
  async getQuestion(@Param('questionId') questionId: number) {
    return this.adminQuestionService.getById(questionId);
  }

  @Put(':questionId')
  async editQuestion(
    @Param('questionId') questionId: number,
    @Body() body: UpdateQuestionAdminDto,
  ) {
    return this.adminQuestionService.update(questionId, body);
  }

  @Put(':questionId/photos')
  async updateQuestionPhotos(
    @Param('questionId') questionId: number,
    @Body() body: UpdatePhotoMappingsAdminDto,
  ) {
    return this.adminUploadService.photoMappingMany(
      PhotoMappingTypeEnum.QUESTION,
      questionId,
      body.photos,
    );
  }

  @Post()
  async createQuestion(@Body() body: CreateQuestionAdminDto) {
    return this.adminQuestionService.create(body);
  }
}
