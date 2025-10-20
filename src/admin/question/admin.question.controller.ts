import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
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

@Controller('/admin/questions')
@UseGuards(AdminAuthGuard)
export class AdminQuestionController {
  constructor(
    private readonly adminQuestionService: AdminQuestionService,
    private readonly adminUploadService: AdminUploadService,
  ) {}

  @Get()
  async getQuestions(@Query() query: GetQuestionListQueryAdminDto) {
    return this.adminQuestionService.getAll(query.page, query.limit, query);
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
