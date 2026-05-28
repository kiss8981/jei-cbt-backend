import { QuestionType } from '../../common/constants/question-type.enum';

type QuestionTypeSource = {
  type?: QuestionType | null;
};

type UnitQuestionTypeSource = QuestionTypeSource & {
  unitId: number;
};

const isQuestionType = (
  questionType: QuestionType | null | undefined,
): questionType is QuestionType => {
  return questionType !== null && questionType !== undefined;
};

export const getGroupedQuestionTypes = (
  questions: QuestionTypeSource[] = [],
): QuestionType[] => {
  return Array.from(
    new Set(questions.map((question) => question.type).filter(isQuestionType)),
  );
};

export const groupQuestionTypesByUnitId = (
  questions: UnitQuestionTypeSource[] = [],
): Record<number, QuestionType[]> => {
  return questions.reduce<Record<number, QuestionType[]>>((acc, question) => {
    const currentTypes = acc[question.unitId] ?? [];

    if (
      isQuestionType(question.type) &&
      !currentTypes.includes(question.type)
    ) {
      currentTypes.push(question.type);
    }

    acc[question.unitId] = currentTypes;
    return acc;
  }, {});
};
