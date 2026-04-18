export enum QuestionType {
  TRUE_FALSE = 'TRUE_FALSE',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  MULTIPLE_CHOICE_INPUT = 'MULTIPLE_CHOICE_INPUT',
  MATCHING = 'MATCHING',
  SHORT_ANSWER = 'SHORT_ANSWER',
  COMPLETION = 'COMPLETION',
  MULTIPLE_SHORT_ANSWER = 'MULTIPLE_SHORT_ANSWER',
  INTERVIEW = 'INTERVIEW',
}

export const userAnswerKeyMapping: {
  [key in QuestionType]: string;
} = {
  [QuestionType.TRUE_FALSE]: 'answersForTrueFalse',
  [QuestionType.MULTIPLE_CHOICE]: 'answersForMultipleChoice',
  [QuestionType.MULTIPLE_CHOICE_INPUT]: 'answersForShortAnswer',
  [QuestionType.MATCHING]: 'answersForMatching',
  [QuestionType.SHORT_ANSWER]: 'answersForShortAnswer',
  [QuestionType.COMPLETION]: 'answerCompletion',
  [QuestionType.MULTIPLE_SHORT_ANSWER]: 'answersForMultipleShortAnswer',
  [QuestionType.INTERVIEW]: 'answersForInterview',
};
