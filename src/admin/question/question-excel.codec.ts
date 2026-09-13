import { createHash } from 'crypto';
import * as XLSX from 'xlsx';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { Question } from 'src/entities/question.entity';
import { Answer } from 'src/entities/answer.entity';

export const EXCEL_MAX_ROWS = 10000;
export const EXCEL_MAX_BYTES = 10 * 1024 * 1024;
const COMMON = ['unitId', 'type', 'title', 'explanation', 'additionalText'];
export const EXCEL_COLUMNS: Record<string, string[]> = {
  TRUE_FALSE: ['answersForCorrectAnswerForTrueFalse'],
  MULTIPLE_CHOICE: [
    'answersForMultipleChoice',
    'answersForMultipleChoiceIsCorrect',
  ],
  MULTIPLE_CHOICE_INPUT: [
    'answersForMultipleChoice',
    'answersForMultipleChoiceIsCorrect',
  ],
  MATCHING: ['answersForMatchingLeftItem', 'answersForMatchingRightItem'],
  SHORT_ANSWER: ['answersForShortAnswer'],
  MULTIPLE_SHORT_ANSWER: [
    'answersForMultipleShortAnswerContent',
    'answersForMultipleShortAnswerOrderIndex',
  ],
  INTERVIEW: ['answersForInterview'],
};

export interface ExcelAnswer {
  content: string | null;
  isCorrect: boolean;
  orderIndex: number;
  rightContent?: string;
}
export interface ExcelQuestion {
  unitId: number;
  type: QuestionType;
  title: string;
  explanation: string | null;
  additionalText: string | null;
  answers: ExcelAnswer[];
}
export interface ExcelRow {
  sheet: string;
  row: number;
  questionId: string | null;
  title: string;
  unitId: number | null;
  unitName?: string;
  originalHash: string;
  status: 'new' | 'updated' | 'unchanged' | 'error';
  errors: string[];
  warnings: string[];
  changes: { field: string; before: string; after: string }[];
  value?: ExcelQuestion;
}

export const digest = (value: unknown) =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const contentHash = (value: ExcelQuestion) => digest(excelFields(value));
const text = (value: unknown) =>
  value == null
    ? ''
    : String(value).replace(/\r+\n/g, '\n').replace(/\r/g, '\n');
function positiveId(value: unknown, label: string): number {
  const input = text(value).trim();
  const number = Number(input);
  if (!/^\d+$/.test(input) || !Number.isSafeInteger(number) || number <= 0)
    throw new Error(`${label}: 올바른 양의 정수가 필요합니다.`);
  return number;
}
function booleanValue(value: unknown): boolean {
  const input = text(value).trim().toLowerCase();
  if (input !== 'true' && input !== 'false')
    throw new Error('정답에는 TRUE 또는 FALSE만 입력하세요.');
  return input === 'true';
}
function lines(value: unknown): string[] {
  const result = text(value).split('\n');
  if (result.some((item) => !item.trim()))
    throw new Error('답안 항목에 빈 줄 또는 빈 값이 있습니다.');
  return result;
}
function equalLengths(a: unknown[], b: unknown[]) {
  if (a.length !== b.length)
    throw new Error('서로 대응하는 답안 컬럼의 줄 수가 다릅니다.');
}

/** Empty legacy alternatives are ignorable only when that blank has a real answer. */
function nonEmptyMultipleShortAnswers<
  T extends { content: string | null; orderIndex: number },
>(answers: T[]): T[] {
  const usable = answers.filter(
    (answer) => text(answer.content).trim().length > 0,
  );
  const covered = new Set(usable.map((answer) => answer.orderIndex));
  for (const answer of answers) {
    if (!text(answer.content).trim() && !covered.has(answer.orderIndex)) {
      throw new Error(
        `빈칸 {${answer.orderIndex}}의 정답 내용이 비어 있습니다. 관리자에서 정답을 입력하세요.`,
      );
    }
  }
  return usable;
}
export function validateBlanks(title: string, indexes: number[]) {
  const placeholders = [...title.matchAll(/\{(\d+)\}/g)].map((match) =>
    Number(match[1]),
  );
  const unique = [...new Set(indexes)].sort((a, b) => a - b);
  if (
    !unique.length ||
    unique.some((value, i) => value !== i) ||
    digest([...new Set(placeholders)].sort((a, b) => a - b)) !== digest(unique)
  ) {
    throw new Error(
      '본문의 {0}, {1} 빈칸과 정답 번호가 일치해야 하며 번호는 0부터 연속이어야 합니다.',
    );
  }
}

function parseValue(record: Record<string, unknown>): ExcelQuestion {
  const type = text(record.type).trim() as QuestionType;
  const title = text(record.title);
  if (!title.trim()) throw new Error('title: 문제 내용은 필수입니다.');
  const value: ExcelQuestion = {
    unitId: positiveId(record.unitId, 'unitId'),
    type,
    title,
    explanation: text(record.explanation) || null,
    additionalText: text(record.additionalText) || null,
    answers: [],
  };
  const answer = (
    content: string | null,
    isCorrect = true,
    orderIndex = 0,
  ): ExcelAnswer => ({ content, isCorrect, orderIndex });
  switch (type) {
    case QuestionType.TRUE_FALSE:
      value.answers = [
        answer(null, booleanValue(record.answersForCorrectAnswerForTrueFalse)),
      ];
      break;
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.MULTIPLE_CHOICE_INPUT: {
      const contents = lines(record.answersForMultipleChoice);
      const corrects = lines(record.answersForMultipleChoiceIsCorrect).map(
        booleanValue,
      );
      equalLengths(contents, corrects);
      if (!corrects.includes(true))
        throw new Error('선다형은 정답을 하나 이상 지정해야 합니다.');
      value.answers = contents.map((content, i) =>
        answer(content, corrects[i]),
      );
      break;
    }
    case QuestionType.MATCHING: {
      const left = lines(record.answersForMatchingLeftItem);
      const right = lines(record.answersForMatchingRightItem);
      equalLengths(left, right);
      value.answers = left.map((content, i) => ({
        ...answer(content, false),
        rightContent: right[i],
      }));
      break;
    }
    case QuestionType.SHORT_ANSWER:
      value.answers = lines(record.answersForShortAnswer).map((content) =>
        answer(content),
      );
      break;
    case QuestionType.MULTIPLE_SHORT_ANSWER: {
      const contents = text(record.answersForMultipleShortAnswerContent).split(
        '\n',
      );
      const indexes = lines(record.answersForMultipleShortAnswerOrderIndex).map(
        (raw) => {
          const item = raw.trim();
          if (!/^\d+$/.test(item) || !Number.isSafeInteger(Number(item)))
            throw new Error('빈칸 번호는 0 이상의 정수여야 합니다.');
          return Number(item);
        },
      );
      // Some spreadsheet editors trim trailing empty lines from older downloads.
      // The server still checks the original hash, answer count and blank structure.
      if (text(record.questionId).trim()) {
        while (contents.length < indexes.length) contents.push('');
      }
      equalLengths(contents, indexes);
      value.answers = contents.map((content, i) =>
        answer(content, true, indexes[i]),
      );
      if (text(record.questionId).trim()) {
        value.answers = nonEmptyMultipleShortAnswers(value.answers);
      } else if (contents.some((content) => !content.trim())) {
        throw new Error('답안 항목에 빈 줄 또는 빈 값이 있습니다.');
      }
      validateBlanks(
        title,
        value.answers.map((answer) => answer.orderIndex),
      );
      break;
    }
    case QuestionType.INTERVIEW: {
      const content = text(record.answersForInterview);
      if (!content.trim()) throw new Error('면접형 모범 답안은 필수입니다.');
      value.answers = [answer(content)];
      break;
    }
    default:
      throw new Error(`지원하지 않는 문제 유형: ${type}`);
  }
  return value;
}

export function parseExcel(buffer: Buffer): ExcelRow[] {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const rows: ExcelRow[] = [];
  for (const name of workbook.SheetNames) {
    if (name === 'README') continue;
    const sheet = workbook.Sheets[name];
    if (!sheet['!ref']) continue;
    const range = XLSX.utils.decode_range(sheet['!ref']);
    // Iterate actual cells, not a potentially enormous formatted !ref range.
    const rowNumbers = new Set<number>();
    for (const address of Object.keys(sheet)) {
      if (
        address.startsWith('!') ||
        sheet[address]?.v == null ||
        text(sheet[address].v).trim() === ''
      )
        continue;
      rowNumbers.add(XLSX.utils.decode_cell(address).r);
    }
    const activeRows = [...rowNumbers].sort((a, b) => a - b);
    if (!activeRows.length) continue;
    const headerRow = range.s.r;
    const headers: Record<string, number> = {};
    const headerErrors: string[] = [];
    for (const address of Object.keys(sheet)) {
      if (address.startsWith('!')) continue;
      const cell = XLSX.utils.decode_cell(address);
      if (cell.r !== headerRow) continue;
      const key = text(sheet[address]?.v).trim();
      if (!key) continue;
      if (headers[key] !== undefined) headerErrors.push(`중복 컬럼: ${key}`);
      headers[key] = cell.c;
    }
    if (!EXCEL_COLUMNS[name]) headerErrors.push(`지원하지 않는 시트: ${name}`);
    else
      for (const key of [...COMMON, ...EXCEL_COLUMNS[name]]) {
        if (headers[key] === undefined)
          headerErrors.push(`필수 컬럼 누락: ${key}`);
      }
    const dataRows = activeRows.filter((row) => row > headerRow);
    if (headerErrors.length && !dataRows.length) dataRows.push(headerRow);
    for (const r of dataRows) {
      if (rows.length >= EXCEL_MAX_ROWS)
        throw new Error(
          `문제는 최대 ${EXCEL_MAX_ROWS.toLocaleString()}행까지 업로드할 수 있습니다.`,
        );
      const record: Record<string, unknown> = {};
      let formula = false;
      for (const [key, column] of Object.entries(headers)) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c: column })];
        record[key] = cell?.v;
        if (cell?.f) formula = true;
      }
      const row: ExcelRow = {
        sheet: name,
        row: r + 1,
        questionId: text(record.questionId).trim() || null,
        title: text(record.title),
        unitId: null,
        originalHash: text(record._originalHash).trim(),
        status: 'new',
        errors: [...headerErrors],
        warnings: [],
        changes: [],
      };
      try {
        row.unitId = positiveId(record.unitId, 'unitId');
        if (formula) throw new Error('수식 대신 값을 입력하세요.');
        if (row.questionId)
          row.questionId = String(positiveId(row.questionId, 'questionId'));
        if (text(record.type).trim() !== name)
          throw new Error('시트 이름과 type 값이 다릅니다.');
        if (!headerErrors.length) {
          row.value = parseValue(record);
          row.unitId = row.value.unitId;
        }
      } catch (error) {
        row.errors.push(error.message);
      }
      if (row.errors.length) row.status = 'error';
      rows.push(row);
    }
  }
  if (!rows.length) throw new Error('업로드할 문제가 없습니다.');
  return rows;
}

export function orderedAnswers(answers: Answer[]): Answer[] {
  return [...answers].sort((a, b) =>
    BigInt(a.id) < BigInt(b.id) ? -1 : BigInt(a.id) > BigInt(b.id) ? 1 : 0,
  );
}
export function snapshot(question: Question, input: Answer[]) {
  if (!EXCEL_COLUMNS[question.type])
    throw new Error(`문제 ${question.id}: 지원하지 않는 유형 ${question.type}`);
  const answers = orderedAnswers(input);
  let slots =
    question.type === QuestionType.MATCHING
      ? answers.filter((a) => a.pairingAnswerId == null)
      : answers;
  const value: ExcelQuestion = {
    unitId: Number(question.unitId),
    type: question.type,
    title: question.title,
    explanation: question.explanation || null,
    additionalText: question.additionalText || null,
    answers: slots.map((a) => {
      const item: ExcelAnswer = {
        content: a.content,
        isCorrect: a.isCorrect,
        orderIndex: a.orderIndex,
      };
      if (question.type === QuestionType.MATCHING) {
        const pairs = answers.filter(
          (right) => String(right.pairingAnswerId) === String(a.id),
        );
        if (pairs.length !== 1)
          throw new Error(
            `문제 ${question.id}: 연결형 보기 구조를 확인하세요.`,
          );
        item.rightContent = pairs[0].content;
      }
      return item;
    }),
  };
  if (
    !slots.length ||
    (question.type === QuestionType.MATCHING &&
      slots.length * 2 !== answers.length)
  )
    throw new Error(`문제 ${question.id}: 답안 구조를 확인하세요.`);
  const hash = digest({
    id: String(question.id),
    value,
    answers: answers.map((a) => [
      String(a.id),
      a.content,
      a.isCorrect,
      a.orderIndex,
      a.pairingAnswerId == null ? null : String(a.pairingAnswerId),
    ]),
  });
  if (question.type === QuestionType.MULTIPLE_SHORT_ANSWER) {
    // Hash the complete database state above, including empty legacy records.
    // Only the editable/exported slots omit empty alternatives. This preserves
    // old download tokens and the IDs of every real answer during later edits.
    try {
      slots = nonEmptyMultipleShortAnswers(slots);
      value.answers = nonEmptyMultipleShortAnswers(value.answers);
    } catch (error) {
      throw new Error(`문제 ${question.id}: ${error.message}`);
    }
  }
  return { value, hash, slots, answers };
}

export function excelFields(
  value: ExcelQuestion,
): Record<string, string | number | boolean> {
  const fields: Record<string, string | number | boolean> = {
    unitId: value.unitId,
    type: value.type,
    title: text(value.title),
    explanation: text(value.explanation),
    additionalText: text(value.additionalText),
  };
  const contents = value.answers.map((a) => text(a.content)).join('\n');
  const corrects = value.answers
    .map((a) => (a.isCorrect ? 'TRUE' : 'FALSE'))
    .join('\n');
  switch (value.type) {
    case QuestionType.TRUE_FALSE:
      fields.answersForCorrectAnswerForTrueFalse = value.answers[0].isCorrect;
      break;
    case QuestionType.MULTIPLE_CHOICE:
    case QuestionType.MULTIPLE_CHOICE_INPUT:
      fields.answersForMultipleChoice = contents;
      fields.answersForMultipleChoiceIsCorrect = corrects;
      break;
    case QuestionType.MATCHING:
      fields.answersForMatchingLeftItem = contents;
      fields.answersForMatchingRightItem = value.answers
        .map((a) => text(a.rightContent))
        .join('\n');
      break;
    case QuestionType.SHORT_ANSWER:
      fields.answersForShortAnswer = contents;
      break;
    case QuestionType.MULTIPLE_SHORT_ANSWER:
      fields.answersForMultipleShortAnswerContent = contents;
      fields.answersForMultipleShortAnswerOrderIndex = value.answers
        .map((a) => a.orderIndex)
        .join('\n');
      break;
    case QuestionType.INTERVIEW:
      fields.answersForInterview = contents;
      break;
  }
  return fields;
}

/** SheetJS CE writes values and dimensions but does not write alignment styles.
 * Only patch the cell formats in our own generated archive; never rewrite uploaded files.
 */
function withWrappedText(buffer: Buffer): Buffer {
  const archive = unzipSync(buffer);
  const styles = strFromU8(archive['xl/styles.xml']);
  const wrapped = styles.replace(
    /<cellXfs\b([^>]*)>([\s\S]*?)<\/cellXfs>/,
    (_match, attributes, formats) => {
      const aligned = formats.replace(
        /<xf\b([^>]*?)(?:\/>|>([\s\S]*?)<\/xf>)/g,
        (_xf, attrs, children = '') =>
          `<xf${attrs.replace(/\sapplyAlignment="[^"]*"/g, '')} applyAlignment="1">${children.replace(/<alignment\b[^>]*\/>/g, '')}<alignment vertical="top" wrapText="1"/></xf>`,
      );
      return `<cellXfs${attributes}>${aligned}</cellXfs>`;
    },
  );
  if (wrapped === styles)
    throw new Error('엑셀 줄바꿈 서식을 적용하지 못했습니다.');
  archive['xl/styles.xml'] = strToU8(wrapped);
  return Buffer.from(zipSync(archive, { level: 6 }));
}

function setReadableRowHeights(
  sheet: XLSX.WorkSheet,
  data: unknown[][],
  widths: number[],
) {
  sheet['!rows'] = data.map((row, rowIndex) => {
    const lineCount = Math.max(
      1,
      ...row.slice(0, widths.length).map((value, column) =>
        text(value)
          .split('\n')
          .reduce((total, line) => {
            // Wide CJK characters occupy roughly two Excel character-width units.
            const width = Array.from(line).reduce(
              (sum, char) => sum + (char.charCodeAt(0) > 255 ? 2 : 1),
              0,
            );
            return (
              total +
              Math.max(1, Math.ceil(width / Math.max(1, widths[column] - 2)))
            );
          }, 0),
      ),
    );
    return {
      hpt: Math.min(
        409,
        Math.max(rowIndex === 0 ? 42 : 24, lineCount * 16 + 8),
      ),
    };
  });
}

export function exportExcel(questions: Question[], answers: Answer[]): Buffer {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet([
      ['항목', '설명'],
      [
        '수정 방법',
        '기존 컬럼과 셀 안 줄바꿈을 유지하세요. questionId와 숨김 검증 컬럼은 수정하지 마세요. 신규 문제는 두 컬럼을 모두 비우세요.',
      ],
      [
        '보존 범위',
        '사진과 학습 기록을 유지합니다. 파일에서 행을 지워도 서버의 문제는 삭제되지 않습니다.',
      ],
      [
        '답안 수정',
        '기존 보기 칸의 문구와 정답을 수정합니다. 보기 개수·능력단위·유형·빈칸 구조는 변경할 수 없습니다. 해설과 추가 설명을 비우면 해당 내용이 삭제됩니다.',
      ],
      [
        '정답 입력',
        'TRUE/FALSE만 입력하세요. 선다형·연결형·단답형은 줄바꿈으로 구분합니다. 다중 단답형의 번호는 본문 {0}, {1}과 일치해야 합니다.',
      ],
    ]),
    'README',
  );
  const grouped = new Map<string, Answer[]>();
  for (const answer of answers)
    grouped.set(String(answer.questionId), [
      ...(grouped.get(String(answer.questionId)) || []),
      answer,
    ]);
  for (const type of Object.keys(EXCEL_COLUMNS)) {
    const columns = [
      ...COMMON,
      ...EXCEL_COLUMNS[type],
      'questionId',
      '_originalHash',
    ];
    const data: unknown[][] = [columns];
    for (const question of questions.filter((q) => q.type === type)) {
      const original = snapshot(
        question,
        grouped.get(String(question.id)) || [],
      );
      const fields = {
        ...excelFields(original.value),
        questionId: String(question.id),
        _originalHash: original.hash,
      };
      data.push(columns.map((column) => fields[column]));
    }
    const sheet = XLSX.utils.aoa_to_sheet(data);
    sheet['!cols'] = columns.map((column) => ({
      wch:
        column === 'title' ||
        column.startsWith('answers') ||
        column === 'explanation'
          ? 55
          : 20,
      hidden: column === '_originalHash',
    }));
    setReadableRowHeights(
      sheet,
      data,
      sheet['!cols'].slice(0, -1).map((column) => column.wch),
    );
    XLSX.utils.book_append_sheet(workbook, sheet, type);
  }
  for (const question of questions)
    if (!EXCEL_COLUMNS[question.type])
      throw new Error(
        `문제 ${question.id}: 지원하지 않는 유형 ${question.type}`,
      );
  const readme = workbook.Sheets.README;
  readme['!cols'] = [{ wch: 18 }, { wch: 100 }];
  setReadableRowHeights(
    readme,
    XLSX.utils.sheet_to_json(readme, { header: 1 }),
    [18, 100],
  );
  return withWrappedText(
    XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
      compression: true,
    }),
  );
}
