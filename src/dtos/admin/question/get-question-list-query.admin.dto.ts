import { Transform } from 'class-transformer';
import { IsNumber, IsOptional, IsString } from 'class-validator';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { toArray, toEnumArray } from 'src/utils/toArray';

export class GetQuestionListQueryAdminDto {
  @IsOptional()
  @Transform(({ value }) => (value == null || value === '' ? 1 : Number(value)))
  @IsNumber()
  page: number = 1;

  @IsOptional()
  @Transform(({ value }) => (value == null || value === '' ? 40 : Number(value)))
  @IsNumber()
  limit: number = 40;

  @IsOptional()
  @IsString({ each: true })
  @toArray()
  unitIds?: number[];

  @IsOptional()
  @IsString({ each: true })
  @toEnumArray(QuestionType)
  questionTypes?: QuestionType[];

  @IsOptional()
  @IsString()
  keyword?: string;
}
