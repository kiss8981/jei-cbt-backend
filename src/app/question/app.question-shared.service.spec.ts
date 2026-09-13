import { AppQuestionSharedService } from './app.question-shared.service';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { Question } from 'src/entities/question.entity';
import { SubmissionAnswerRequestAppDto } from 'src/dtos/app/question/submission-answer-request.app.dto';

describe('Short answer grading', () => {
  const repository = { findByQuestionId: jest.fn() };
  const service = new AppQuestionSharedService(repository as any);
  const question = {
    id: 1,
    type: QuestionType.SHORT_ANSWER,
    explanation: '해설',
  } as Question;
  const grade = (content: string) =>
    service.isAnswerCorrect(question, {
      type: question.type,
      answersForShortAnswer: content,
    } as SubmissionAnswerRequestAppDto);
  beforeEach(() =>
    repository.findByQuestionId.mockResolvedValue([
      { id: 10, isCorrect: true, content: '자재 목록표' },
      { id: 11, isCorrect: true, content: 'BOM' },
      { id: 12, isCorrect: false, content: '오답' },
    ]),
  );
  it.each(['자재 목록표', 'BOM', ' bom '])(
    'accepts any administrator-defined answer: %s',
    async (content) => {
      expect((await grade(content)).isCorrect).toBe(true);
    },
  );
  it.each(['', '   ', '오답', '자재목록표', '자재 목록표 BOM'])(
    'rejects unregistered answers: %j',
    async (content) => {
      expect((await grade(content)).isCorrect).toBe(false);
    },
  );
  it('does not automatically remove parenthetical English', async () => {
    repository.findByQuestionId.mockResolvedValue([
      { isCorrect: true, content: '자재 목록표(bill of material)' },
    ]);
    expect((await grade('자재 목록표')).isCorrect).toBe(false);
    expect((await grade('자재 목록표(bill of material)')).isCorrect).toBe(true);
  });
  it('returns false instead of failing when no usable answer exists', async () => {
    repository.findByQuestionId.mockResolvedValue([]);
    expect((await grade('BOM')).isCorrect).toBe(false);
  });
  it('shows all registered alternatives in the answer explanation', async () => {
    expect((await grade('BOM')).answer).toBe('자재 목록표 / BOM');
  });
  it('preserves the existing multiple-short-answer spacing comparison', async () => {
    repository.findByQuestionId.mockResolvedValue([
      { isCorrect: true, orderIndex: 0, content: '자재 목록표' },
    ]);
    const result = await service.isAnswerCorrect(
      { ...question, type: QuestionType.MULTIPLE_SHORT_ANSWER },
      {
        type: QuestionType.MULTIPLE_SHORT_ANSWER,
        answersForMultipleShortAnswer: [
          { orderIndex: 0, content: '자재 목록표' },
        ],
      } as SubmissionAnswerRequestAppDto,
    );
    expect(result.isCorrect).toBe(true);
  });
});
