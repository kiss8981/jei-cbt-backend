import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { QuestionType } from 'src/common/constants/question-type.enum';

export class CreateQuestionAdminDto {
  @IsNumber({}, { message: 'unitId는 숫자여야 합니다.' })
  @IsNotEmpty({ message: 'unitId는 필수입니다.' })
  unitId: number; // 소속 단위 ID

  @IsEnum(QuestionType, { message: '유효하지 않은 문제 유형입니다.' })
  @IsNotEmpty({ message: '문제 유형은 필수입니다.' })
  type: QuestionType; // 문제 유형 (enum)

  @IsNotEmpty({ message: '문제 제목/내용은 필수입니다.' })
  @IsString()
  title: string;
  // 네덜란드의 수도는 {0}이고, 프랑스의 수도는 {1}이다.
  // (빈칸형 문제의 경우 {0}, {1}과 같이 표시)
  // 면접형 문제의 경우 질문 내용
  // 진위형, 선다형, 연결형, 단답형 문제의 경우 문제 내용
  // (길이 제한 없음)

  @IsOptional()
  @IsString()
  explanation?: string; // 문제 해설

  @IsOptional()
  @IsString()
  additionalText?: string; // 문제에 대한 추가 정보 (문제 하단 표시)

  @ValidateIf((o: CreateQuestionAdminDto) => o.type == QuestionType.TRUE_FALSE)
  @IsBoolean({ message: '정답은 true 또는 false여야 합니다.' })
  @IsNotEmpty({ message: '진위형 문제의 정답은 필수입니다.' })
  answersForCorrectAnswerForTrueFalse?: boolean; // 진위형 정답

  @ValidateIf(
    (o: CreateQuestionAdminDto) => o.type == QuestionType.MULTIPLE_CHOICE,
  )
  @IsNotEmpty({ message: '선다형 문제의 보기는 필수입니다.' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionMultipleChoiceAdminDto)
  answersForMultipleChoice?: CreateQuestionMultipleChoiceAdminDto[]; // 선다형 보기 목록

  @ValidateIf((o: CreateQuestionAdminDto) => o.type == QuestionType.MATCHING)
  @IsNotEmpty({ message: '연결형 문제의 보기는 필수입니다.' })
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionMatchingAdminDto)
  answersForMatching?: CreateQuestionMatchingAdminDto[]; // 연결형 보기 목록

  @ValidateIf(
    (o: CreateQuestionAdminDto) => o.type == QuestionType.SHORT_ANSWER,
  )
  @IsNotEmpty({ message: '단답형 문제의 정답은 필수입니다.' })
  @IsString({ each: true })
  answersForShortAnswer?: string[]; // 단답형 정답 목록

  @ValidateIf((o: CreateQuestionAdminDto) => o.type == QuestionType.COMPLETION)
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionCompletionAdminDto)
  answersForCompletion?: CreateQuestionCompletionAdminDto[];

  @ValidateIf(
    (o: CreateQuestionAdminDto) => o.type == QuestionType.MULTIPLE_SHORT_ANSWER,
  )
  @ValidateNested({ each: true })
  @Type(() => CreateQuestionMultipleChoiceAnswerAdminDto)
  answersForMultipleShortAnswer?: CreateQuestionMultipleChoiceAnswerAdminDto[];

  @ValidateIf((o: CreateQuestionAdminDto) => o.type == QuestionType.INTERVIEW)
  @IsNotEmpty({ message: '면접형 문제의 정답은 필수입니다.' })
  @IsString()
  answersForInterview?: string; // 면접형 정답
}

export class CreateQuestionMultipleChoiceAnswerAdminDto {
  @IsNotEmpty({ message: '정답 내용은 필수입니다.' })
  @IsString()
  content: string; // 정답 내용

  @IsNumber()
  @IsOptional()
  orderIndex: number; // 빈칸 순서 (0부터 시작)
}

export class CreateQuestionCompletionAdminDto {
  @IsNotEmpty({ message: '보기 내용은 필수입니다.' })
  @IsString()
  content: string; // 보기 내용

  @IsBoolean({ message: '정답 여부는 true 또는 false여야 합니다.' })
  @IsNotEmpty({ message: '보기의 정답 여부는 필수입니다.' })
  isCorrect: boolean; // 정답 여부
}

export class CreateQuestionMatchingAdminDto {
  @IsString()
  @IsNotEmpty({ message: '연결형 문제의 왼쪽 항목은 필수입니다.' })
  leftItem: string; // 연결형 왼쪽 항목

  @IsString()
  @IsNotEmpty({ message: '연결형 문제의 오른쪽 항목은 필수입니다.' })
  rightItem: string; // 연결형 오른쪽 항목
}

export class CreateQuestionMultipleChoiceAdminDto {
  @IsNotEmpty({ message: '보기 내용은 필수입니다.' })
  @IsString()
  content: string; // 보기 내용

  @IsBoolean({ message: '정답 여부는 true 또는 false여야 합니다.' })
  @IsNotEmpty({ message: '보기의 정답 여부는 필수입니다.' })
  isCorrect: boolean; // 정답 여부 // 여러 개 정답 가능
}
