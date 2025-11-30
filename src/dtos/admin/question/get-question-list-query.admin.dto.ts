import { IsNumberString, IsOptional, IsString } from 'class-validator';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { toArray, toEnumArray } from 'src/utils/toArray';

export class GetQuestionListQueryAdminDto {
  @IsOptional()
  @IsNumberString()
  page: number = 1;

  @IsOptional()
  @IsNumberString()
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
