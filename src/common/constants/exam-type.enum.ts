export enum ExamType {
  EXTERNAL_EVALUATION = 'EXTERNAL_EVALUATION',
  CRAFTSMAN = 'CRAFTSMAN',
}

export const EXAM_TYPE_LABELS: Record<ExamType, string> = {
  [ExamType.EXTERNAL_EVALUATION]: '외부평가',
  [ExamType.CRAFTSMAN]: '기능사',
};
