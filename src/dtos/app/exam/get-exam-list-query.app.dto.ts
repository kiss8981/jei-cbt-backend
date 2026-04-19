import { IsEnum, IsNumberString, IsOptional } from 'class-validator';
import { ExamType } from 'src/common/constants/exam-type.enum';

export class GetExamListQueryAppDto {
  @IsOptional()
  @IsEnum(ExamType)
  type?: ExamType;

  @IsOptional()
  @IsNumberString()
  page: number;

  @IsOptional()
  @IsNumberString()
  limit: number;
}
