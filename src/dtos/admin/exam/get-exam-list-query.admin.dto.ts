import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';
import { ExamType } from 'src/common/constants/exam-type.enum';

export class GetExamListQueryAdminDto {
  @IsOptional()
  @IsNumberString()
  page: number;

  @IsOptional()
  @IsNumberString()
  limit: number;

  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsEnum(ExamType)
  type?: ExamType;
}
