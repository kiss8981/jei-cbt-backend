import { Expose, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from 'src/common/constants/question-type.enum';

export class SubmissionAnswerRequestAppDto {
  @IsEnum(QuestionType, { message: '유효하지 않은 문제 유형입니다.' })
  @IsNotEmpty({ message: '문제 유형은 필수입니다.' })
  type: QuestionType; // 문제 유형 (enum)

  @ValidateIf(
    (o: SubmissionAnswerRequestAppDto) => o.type == QuestionType.TRUE_FALSE,
  )
  @IsBoolean({ message: '정답은 true 또는 false여야 합니다.' })
  @IsNotEmpty({ message: '진위형 문제의 정답은 필수입니다.' })
  answersForTrueFalse?: boolean; // 진위형 정답

  @ValidateIf(
    (o: SubmissionAnswerRequestAppDto) =>
      o.type == QuestionType.MULTIPLE_CHOICE,
  )
  @IsNotEmpty({ message: '정답은 필수입니다.' })
  @ValidateNested({ each: true })
  @Type(() => Number)
  answersForMultipleChoice?: number[];

  @ValidateIf(
    (o: SubmissionAnswerRequestAppDto) => o.type == QuestionType.MATCHING,
  )
  @IsNotEmpty({ message: '연결형 문제의 답안은 필수입니다.' })
  @ValidateNested({ each: true })
  @Type(() => SubmissionAnswersForMatchingAppDto)
  answersForMatching?: SubmissionAnswersForMatchingAppDto[];

  @ValidateIf(
    (o: SubmissionAnswerRequestAppDto) => o.type == QuestionType.SHORT_ANSWER,
  )
  @IsNotEmpty({ message: '정답 내용은 필수입니다.' })
  @IsString()
  answersForShortAnswer?: string; // 단답형 정답

  @ValidateIf(
    (o: SubmissionAnswerRequestAppDto) =>
      o.type == QuestionType.MULTIPLE_SHORT_ANSWER,
  )
  @IsNotEmpty({ message: '빈칸형 문제의 답안은 필수입니다.' })
  @ValidateNested({ each: true })
  @Type(() => SubmissionAnswersForMultipleShortAppDto)
  answersForMultipleShortAnswer?: SubmissionAnswersForMultipleShortAppDto[];

  @ValidateIf(
    (o: SubmissionAnswerRequestAppDto) => o.type == QuestionType.INTERVIEW,
  )
  @IsNotEmpty({ message: '면접형 문제의 답변은 필수입니다.' })
  @IsString()
  answersForInterview?: string; // 면접형 답변
}

export class SubmissionAnswersForMatchingAppDto {
  @IsNumber()
  @IsNotEmpty({ message: '연결형 문제의 왼쪽 항목은 필수입니다.' })
  leftItemId: number; // 연결형 왼쪽 항목 ID

  @IsNumber()
  @IsNotEmpty({ message: '연결형 문제의 오른쪽 항목은 필수입니다.' })
  rightItem: number; // 연결형 오른쪽 항목
}

export class SubmissionAnswersForMultipleShortAppDto {
  @IsNotEmpty({ message: '정답 내용은 필수입니다.' })
  @IsString()
  content: string; // 정답 내용

  @IsNumber()
  @IsNotEmpty({ message: '빈칸 순서는 필수입니다.' })
  orderIndex: number; // 빈칸 순서 (0부터 시작)
}
