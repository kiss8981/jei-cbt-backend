export enum QuestionType {
  TRUE_FALSE = 'TRUE_FALSE', // 진위형 (참/거짓)
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE', // 선다형
  MATCHING = 'MATCHING', // 연결형
  SHORT_ANSWER = 'SHORT_ANSWER', // 순수 단답형
  COMPLETION = 'COMPLETION', // 빈칸 채우기 (완성형)
  MULTIPLE_SHORT_ANSWER = 'MULTIPLE_SHORT_ANSWER', // 복수 단답형
  INTERVIEW = 'INTERVIEW', // 면접 질문
}

export const userAnswerKeyMapping: {
  [key in QuestionType]: string;
} = {
  [QuestionType.TRUE_FALSE]: 'answersForTrueFalse',
  [QuestionType.MULTIPLE_CHOICE]: 'answersForMultipleChoice',
  [QuestionType.MATCHING]: 'answersForMatching',
  [QuestionType.SHORT_ANSWER]: 'answersForShortAnswer',
  [QuestionType.COMPLETION]: 'answerCompletion',
  [QuestionType.MULTIPLE_SHORT_ANSWER]: 'answersForMultipleShortAnswer',
  [QuestionType.INTERVIEW]: 'answersForInterview',
};
