import { IsOptional, IsString } from 'class-validator';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { toArray, toEnumArray } from 'src/utils/toArray';

export class ExportQuestionListQueryAdminDto {
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
