import { QuestionType } from '../../common/constants/question-type.enum';
import {
  getGroupedQuestionTypes,
  groupQuestionTypesByUnitId,
} from './unit-question-types';

describe('getGroupedQuestionTypes', () => {
  it('returns unique question types from unit questions', () => {
    expect(
      getGroupedQuestionTypes([
        { type: QuestionType.INTERVIEW },
        { type: QuestionType.INTERVIEW },
        { type: QuestionType.MULTIPLE_CHOICE },
        { type: QuestionType.TRUE_FALSE },
      ]),
    ).toEqual([
      QuestionType.INTERVIEW,
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.TRUE_FALSE,
    ]);
  });

  it('returns an empty array when a unit has no questions', () => {
    expect(getGroupedQuestionTypes([])).toEqual([]);
  });

  it('groups question types by unit id', () => {
    expect(
      groupQuestionTypesByUnitId([
        { unitId: 1, type: QuestionType.INTERVIEW },
        { unitId: 1, type: QuestionType.INTERVIEW },
        { unitId: 1, type: QuestionType.TRUE_FALSE },
        { unitId: 2, type: QuestionType.MULTIPLE_CHOICE },
      ]),
    ).toEqual({
      1: [QuestionType.INTERVIEW, QuestionType.TRUE_FALSE],
      2: [QuestionType.MULTIPLE_CHOICE],
    });
  });
});
