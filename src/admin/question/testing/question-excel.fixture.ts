import * as XLSX from 'xlsx';
import { Question } from 'src/entities/question.entity';
import { Answer } from 'src/entities/answer.entity';
import { QuestionType } from 'src/common/constants/question-type.enum';

export function fixture() {
  const types = [
    QuestionType.TRUE_FALSE,
    QuestionType.MULTIPLE_CHOICE,
    QuestionType.MULTIPLE_CHOICE_INPUT,
    QuestionType.MATCHING,
    QuestionType.SHORT_ANSWER,
    QuestionType.MULTIPLE_SHORT_ANSWER,
    QuestionType.INTERVIEW,
  ];
  const questions = types.map((type, i) =>
    Object.assign(new Question(), {
      id: i + 1,
      unitId: (i % 2) + 1,
      type,
      title:
        type === QuestionType.MULTIPLE_SHORT_ANSWER
          ? '본문 {0} / {1}'
          : `문제 ${type}`,
      explanation: '기존 해설',
      additionalText: null,
    }),
  );
  const answers: Answer[] = [];
  let id = 100;
  const add = (
    question: Question,
    content: string | null,
    isCorrect = true,
    orderIndex = 0,
    pairingAnswerId: number | null = null,
  ) => {
    const answer = Object.assign(new Answer(), {
      id: ++id,
      questionId: question.id,
      content,
      isCorrect,
      orderIndex,
      pairingAnswerId,
    });
    answers.push(answer);
    return answer;
  };
  for (const q of questions) {
    switch (q.type) {
      case QuestionType.TRUE_FALSE:
        add(q, null, false);
        break;
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.MULTIPLE_CHOICE_INPUT:
        add(q, '첫 번째 보기');
        add(q, '두 번째 보기', false);
        break;
      case QuestionType.MATCHING: {
        const left = add(q, '왼쪽', false);
        add(q, '오른쪽', false, 0, left.id);
        break;
      }
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        add(q, '정답 0', true, 0);
        add(q, '대체 정답 0', true, 0);
        add(q, '정답 1', true, 1);
        break;
      case QuestionType.INTERVIEW:
        add(q, '면접 답변\n두 번째 문단');
        break;
      default:
        add(q, '단답형 정답');
        break;
    }
  }
  return { questions, answers };
}
export function editWorkbook(
  buffer: Buffer,
  edit: (workbook: XLSX.WorkBook) => void,
): Buffer {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  edit(workbook);
  return XLSX.write(workbook, {
    type: 'buffer',
    bookType: 'xlsx',
    compression: true,
  });
}
export function setField(
  sheet: XLSX.WorkSheet,
  field: string,
  value: string | number | boolean,
  row = 2,
) {
  const headers = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 })[0];
  const column = headers.indexOf(field);
  if (column < 0) throw new Error(`Missing ${field}`);
  sheet[XLSX.utils.encode_cell({ r: row - 1, c: column })] = {
    t: typeof value === 'number' ? 'n' : typeof value === 'boolean' ? 'b' : 's',
    v: value,
  };
}
export function excelFile(buffer: Buffer): Express.Multer.File {
  return {
    buffer,
    originalname: 'questions.xlsx',
    size: buffer.length,
  } as Express.Multer.File;
}
