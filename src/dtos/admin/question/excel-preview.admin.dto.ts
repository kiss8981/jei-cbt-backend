import { QuestionType } from 'src/common/constants/question-type.enum';

export class QuestionExcelFieldDiffAdminDto {
  field: string;
  currentValue: string | number | boolean | null;
  uploadedValue: string | number | boolean | null;
}

export class QuestionExcelChildDiffAdminDto {
  kind:
    | 'create'
    | 'update'
    | 'delete'
    | 'reorder'
    | 'conflict'
    | 'unchanged';
  itemId?: number | null;
  label: string;
  currentValue?: string | number | boolean | null;
  uploadedValue?: string | number | boolean | null;
}

export class ParsedQuestionExcelChoiceAdminDto {
  id?: number | null;
  content: string;
  isCorrect?: boolean;
  orderIndex?: number;
}

export class ParsedQuestionExcelMatchingAdminDto {
  leftItemId?: number | null;
  pairingItemId?: number | null;
  leftItem: string;
  rightItem: string;
  orderIndex: number;
}

export class ParsedQuestionExcelRowAdminDto {
  sheetName: string;
  rowNumber: number;
  validationErrors?: string[];
  questionId?: number | null;
  unitId: number;
  type: QuestionType;
  title: string;
  explanation?: string | null;
  additionalText?: string | null;
  answersForCorrectAnswerForTrueFalse?: boolean;
  answersForInterview?: string;
  answersForShortAnswers?: ParsedQuestionExcelChoiceAdminDto[];
  answersForMultipleShortAnswer?: ParsedQuestionExcelChoiceAdminDto[];
  answersForMultipleChoice?: ParsedQuestionExcelChoiceAdminDto[];
  answersForMatching?: ParsedQuestionExcelMatchingAdminDto[];
}

export class PreviewQuestionExcelItemAdminDto {
  sheetName: string;
  rowNumber: number;
  questionId?: number | null;
  title: string;
  type: QuestionType;
  status: 'create' | 'update' | 'unchanged' | 'conflict';
  fieldDiffs: QuestionExcelFieldDiffAdminDto[];
  childDiffs: QuestionExcelChildDiffAdminDto[];
  conflicts: string[];
  parsedData: ParsedQuestionExcelRowAdminDto;
}

export class PreviewQuestionExcelResponseAdminDto {
  summary: {
    totalCount: number;
    createCount: number;
    updateCount: number;
    unchangedCount: number;
    conflictCount: number;
  };
  items: PreviewQuestionExcelItemAdminDto[];
}
