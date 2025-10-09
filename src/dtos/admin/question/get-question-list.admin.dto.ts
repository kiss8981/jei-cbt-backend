import { Expose } from 'class-transformer';
import { QuestionType } from 'src/common/constants/question-type.enum';

export class GetQuestionListAdminDto {
  @Expose()
  id: number;

  @Expose()
  type: QuestionType;

  @Expose()
  title: string;

  @Expose()
  unitId: number;

  @Expose()
  unitName: string;

  @Expose()
  createdAt: Date;
}
