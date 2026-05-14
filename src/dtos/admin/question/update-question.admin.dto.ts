import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateQuestionAdminDto {
  @IsOptional()
  @IsNumber()
  unitId?: number;

  @IsNotEmpty({ message: '문제 제목/내용은 필수입니다.' })
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  additionalText?: string;

  @IsOptional()
  answersForCorrectAnswerForTrueFalse?: boolean;

  @IsOptional()
  answersForMultipleChoice?: UpdateQuestionMultipleChoiceAdminDto[];

  @IsOptional()
  answersForMatching?: UpdateQuestionMatchingAdminDto[];

  @IsOptional()
  answersForShortAnswers?: UpdateQuestionSortAnswerAdminDto[];

  @IsOptional()
  answersForMultipleShortAnswer?: UpdateQuestionMultipleShortAnswerAdminDto[];

  @IsOptional()
  answersForInterview?: string;
}

export class UpdateQuestionSortAnswerAdminDto {
  @IsNumber({}, { message: '정답 ID는 숫자여야 합니다.' })
  @IsOptional()
  id: number | null;

  @IsNotEmpty({ message: '정답 내용은 필수입니다.' })
  @IsString()
  content: string;
}

export class UpdateQuestionMultipleShortAnswerAdminDto {
  @IsNumber({}, { message: '정답 ID는 숫자여야 합니다.' })
  @IsOptional()
  id: number | null;

  @IsNotEmpty({ message: '정답 내용은 필수입니다.' })
  @IsString()
  content: string;

  @IsNumber()
  @IsOptional()
  orderIndex: number;
}

export class CreateQuestionCompletionAdminDto {
  @IsNotEmpty({ message: '보기 내용은 필수입니다.' })
  @IsString()
  content: string;

  @IsBoolean({ message: '정답 여부는 true 또는 false여야 합니다.' })
  @IsNotEmpty({ message: '보기의 정답 여부는 필수입니다.' })
  isCorrect: boolean;
}

export class UpdateQuestionMatchingAdminDto {
  @IsNumber()
  @IsOptional()
  leftItemId: number | null;

  @IsNumber()
  @IsOptional()
  pairingItemId: number | null;

  @IsString()
  @IsNotEmpty({ message: '연결형 문제의 왼쪽 항목은 필수입니다.' })
  leftItem: string;

  @IsString()
  @IsNotEmpty({ message: '연결형 문제의 오른쪽 항목은 필수입니다.' })
  rightItem: string;
}

export class UpdateQuestionMultipleChoiceAdminDto {
  @IsNumber()
  @IsOptional()
  id: number | null;

  @IsNotEmpty({ message: '보기 내용은 필수입니다.' })
  @IsString()
  content: string;

  @IsBoolean({ message: '정답 여부는 true 또는 false여야 합니다.' })
  @IsNotEmpty({ message: '보기의 정답 여부는 필수입니다.' })
  isCorrect: boolean;
}
