import { Expose } from 'class-transformer';
import { IsBoolean, IsEnum, IsString } from 'class-validator';
import { ExamType } from 'src/common/constants/exam-type.enum';

export class CreateExamAdminDto {
  @Expose()
  @IsEnum(ExamType)
  type: ExamType;

  @Expose()
  @IsString()
  title: string;

  @Expose()
  @IsBoolean()
  isDisplayed: boolean;
}
