import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { CreateQuestionAdminDto } from 'src/dtos/admin/question/create-question.admin.dto';
import { GetQuestionListQueryAdminDto } from 'src/dtos/admin/question/get-question-list-query.admin.dto';
import { AdminQuestionService } from './admin.question.service';
import { UpdateQuestionAdminDto } from 'src/dtos/admin/question/update-question.admin.dto';
import {
  UpdatePhotoMappingAdminDto,
  UpdatePhotoMappingsAdminDto,
} from 'src/dtos/admin/upload/update-photo-mapping.admin.dto';
import { AdminUploadService } from '../upload/admin.upload.service';
import { PhotoMappingTypeEnum } from 'src/common/constants/photo-mapping-type.enum';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express, Response, Request } from 'express';
import { AdminQuestionExcelService } from './admin.question-excel.service';
import { CommitQuestionExcelAdminDto } from 'src/dtos/admin/question/question-excel.admin.dto';
import { EXCEL_MAX_BYTES } from './question-excel.codec';
import { DeleteQuestionsAdminDto } from 'src/dtos/admin/question/delete-questions.admin.dto';

@Controller('/admin/questions')
@UseGuards(AdminAuthGuard)
export class AdminQuestionController {
  constructor(
    private readonly adminQuestionService: AdminQuestionService,
    private readonly adminUploadService: AdminUploadService,
    private readonly excelService: AdminQuestionExcelService,
  ) {}

  @Get()
  async getQuestions(@Query() query: GetQuestionListQueryAdminDto) {
    return this.adminQuestionService.getAll(query.page, query.limit, query);
  }

  @Get('excel')
  async downloadExcel(
    @Query('unitIds') unitIds: string,
    @Res() response: Response,
  ) {
    const buffer = await this.excelService.download(unitIds);
    response.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    response.setHeader(
      'Content-Disposition',
      'attachment; filename="questions.xlsx"',
    );
    response.setHeader('Cache-Control', 'no-store');
    response.send(buffer);
  }

  @Post(['excel', 'excel/preview'])
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: EXCEL_MAX_BYTES, files: 1 },
    }),
  )
  async previewExcel(
    @Req() request: Request,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.excelService.preview(request['user'].sub, file);
  }

  @Post('excel/commit')
  async commitExcel(
    @Req() request: Request,
    @Body() dto: CommitQuestionExcelAdminDto,
  ) {
    return this.excelService.commit(request['user'].sub, dto);
  }

  @Delete('bulk')
  async deleteQuestions(@Body() dto: DeleteQuestionsAdminDto) {
    return this.adminQuestionService.deleteMany(dto.questionIds);
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
