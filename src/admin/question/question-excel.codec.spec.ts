import * as XLSX from 'xlsx';
import { strFromU8, unzipSync } from 'fflate';
import {
  contentHash,
  digest,
  excelFields,
  EXCEL_COLUMNS,
  exportExcel,
  parseExcel,
  snapshot,
} from './question-excel.codec';
import {
  editWorkbook,
  fixture,
  setField,
} from './testing/question-excel.fixture';

describe('Question Excel codec', () => {
  const { questions, answers } = fixture();
  const original = exportExcel(questions, answers);

  it.each([null, '', '   '])(
    'exports content and indexes from the same nonempty multiple-short-answer slots (%j)',
    (emptyContent) => {
      const question = questions.find(
        (q) => q.type === 'MULTIPLE_SHORT_ANSWER',
      );
      const realAnswers = answers.filter((a) => a.questionId === question.id);
      const empty = { ...realAnswers[0], id: 999, content: emptyContent };
      const all = [...realAnswers, empty];
      const originalValue = snapshot(question, realAnswers).value;
      const legacyHash = digest({
        id: String(question.id),
        value: {
          ...originalValue,
          answers: [
            ...originalValue.answers,
            { content: emptyContent, isCorrect: true, orderIndex: 0 },
          ],
        },
        answers: all.map((a) => [
          String(a.id),
          a.content,
          a.isCorrect,
          a.orderIndex,
          a.pairingAnswerId == null ? null : String(a.pairingAnswerId),
        ]),
      });
      const current = snapshot(question, all);
      expect(current.hash).toBe(legacyHash);
      expect(current.slots.map((a) => a.id)).toEqual(
        realAnswers.map((a) => a.id),
      );
      const file = exportExcel([question], all);
      const data = XLSX.utils.sheet_to_json<Record<string, string>>(
        XLSX.read(file).Sheets.MULTIPLE_SHORT_ANSWER,
      )[0];
      expect(data.answersForMultipleShortAnswerContent).toBe(
        '정답 0\n대체 정답 0\n정답 1',
      );
      expect(data.answersForMultipleShortAnswerOrderIndex).toBe('0\n0\n1');
      expect(parseExcel(file)[0].errors).toEqual([]);

      const oldFile = editWorkbook(file, (workbook) => {
        setField(
          workbook.Sheets.MULTIPLE_SHORT_ANSWER,
          'answersForMultipleShortAnswerContent',
          '정답 0\n대체 정답 0\n정답 1\n',
        );
        setField(
          workbook.Sheets.MULTIPLE_SHORT_ANSWER,
          'answersForMultipleShortAnswerOrderIndex',
          '0\n0\n1\n0',
        );
      });
      const oldRow = parseExcel(oldFile)[0];
      expect(oldRow.errors).toEqual([]);
      expect(oldRow.value).toEqual(current.value);
      expect(oldRow.originalHash).toBe(current.hash);
    },
  );

  it('does not ignore an empty answer that leaves a required blank unanswered', () => {
    const question = questions.find((q) => q.type === 'MULTIPLE_SHORT_ANSWER');
    const incomplete = answers
      .filter((a) => a.questionId === question.id)
      .map((a) => (a.orderIndex === 1 ? { ...a, content: '' } : a));
    expect(() => exportExcel([question], incomplete)).toThrow(
      `문제 ${question.id}: 빈칸 {1}`,
    );
    const file = editWorkbook(original, (workbook) => {
      setField(
        workbook.Sheets.MULTIPLE_SHORT_ANSWER,
        'answersForMultipleShortAnswerContent',
        '정답 0\n대체 정답 0\n',
      );
    });
    expect(
      parseExcel(file)
        .find((row) => row.sheet === 'MULTIPLE_SHORT_ANSWER')
        .errors.join(' '),
    ).toContain('빈칸 {1}');
  });

  it('keeps rejecting empty answer entries in newly authored rows', () => {
    const file = editWorkbook(original, (workbook) => {
      setField(workbook.Sheets.MULTIPLE_SHORT_ANSWER, 'questionId', '');
      setField(workbook.Sheets.MULTIPLE_SHORT_ANSWER, '_originalHash', '');
      setField(
        workbook.Sheets.MULTIPLE_SHORT_ANSWER,
        'answersForMultipleShortAnswerContent',
        '정답 0\n\n정답 1',
      );
    });
    expect(
      parseExcel(file).find((row) => row.sheet === 'MULTIPLE_SHORT_ANSWER')
        .status,
    ).toBe('error');
  });

  it('writes wrapped, top-aligned cells and readable multiline row heights', () => {
    const archive = unzipSync(original);
    const styles = strFromU8(archive['xl/styles.xml']);
    expect(styles).toContain('<alignment vertical="top" wrapText="1"/>');
    expect(styles).toContain('applyAlignment="1"');
    const workbook = XLSX.read(original, { cellStyles: true });
    expect(
      workbook.Sheets.MULTIPLE_CHOICE['!rows'][1].hpt,
    ).toBeGreaterThanOrEqual(40);
    expect(workbook.Sheets.MULTIPLE_CHOICE.F2.v).toBe(
      '첫 번째 보기\n두 번째 보기',
    );
    expect(workbook.Sheets.MULTIPLE_CHOICE.G2.v).toBe('TRUE\nFALSE');
  });

  it.each(['\n', '\r\n', '\r', '\r\r\n'])(
    'normalizes %j line endings without creating spurious MATCHING differences',
    (ending) => {
      const q = {
        ...questions.find((question) => question.type === 'MATCHING'),
        explanation: `LBS 설명${ending}MOF 설명${ending}${ending}별도 문단`,
      };
      const a = answers.filter((answer) => answer.questionId === q.id);
      const source = snapshot(q, a);
      const row = parseExcel(exportExcel([q], a))[0];
      expect(row.value.explanation).toBe('LBS 설명\nMOF 설명\n\n별도 문단');
      expect(excelFields(row.value)).toEqual(excelFields(source.value));
      expect(row.originalHash).toBe(source.hash);
    },
  );

  it('accepts Excel-resaved CR CR LF text from older downloads without doubling paragraph breaks', () => {
    const file = editWorkbook(original, (workbook) => {
      setField(
        workbook.Sheets.MATCHING,
        'explanation',
        'LBS 설명\r\r\nMOF 설명\r\r\n\r\r\n별도 문단',
      );
      setField(
        workbook.Sheets.MATCHING,
        'answersForMatchingLeftItem',
        'LBS\r\nMOF',
      );
      setField(
        workbook.Sheets.MATCHING,
        'answersForMatchingRightItem',
        '개폐기\r\n변성기',
      );
    });
    const row = parseExcel(file).find((row) => row.sheet === 'MATCHING');
    expect(row.errors).toEqual([]);
    expect(row.value.explanation).toBe('LBS 설명\nMOF 설명\n\n별도 문단');
    expect(row.value.answers).toHaveLength(2);
  });

  it('round-trips all seven types, multiline answers, FALSE, IDs and hidden hashes', () => {
    const workbook = XLSX.read(original, { type: 'buffer', cellStyles: true });
    for (const type of Object.keys(EXCEL_COLUMNS)) {
      const sheet = workbook.Sheets[type];
      expect(sheet['!cols'].at(-1).hidden).toBe(true);
      const headers = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
      })[0];
      expect(
        sheet[
          XLSX.utils.encode_cell({ r: 1, c: headers.indexOf('questionId') })
        ].t,
      ).toBe('s');
    }
    const rows = parseExcel(original);
    expect(rows).toHaveLength(7);
    for (const row of rows) {
      expect(row.errors).toEqual([]);
      const question = questions.find((q) => String(q.id) === row.questionId);
      const expected = snapshot(
        question,
        answers.filter((a) => a.questionId === question.id),
      );
      expect(row.originalHash).toBe(expected.hash);
      expect(contentHash(row.value)).toBe(contentHash(expected.value));
    }
  });

  it('detects changes to answer IDs, answer content and pairing in the original hash', () => {
    const q = questions[1];
    const a = answers.filter((item) => item.questionId === q.id);
    const hash = snapshot(q, a).hash;
    expect(
      snapshot(
        q,
        a.map((item, i) => (i ? item : { ...item, id: 999 })),
      ).hash,
    ).not.toBe(hash);
    expect(
      snapshot(
        q,
        a.map((item) => ({ ...item, content: '변경' })),
      ).hash,
    ).not.toBe(hash);
  });

  it('supports legacy files without question IDs and sheet reordering', () => {
    const buffer = editWorkbook(original, (workbook) => {
      workbook.SheetNames.reverse();
      for (const name of Object.keys(EXCEL_COLUMNS)) {
        setField(workbook.Sheets[name], 'questionId', '');
        setField(workbook.Sheets[name], '_originalHash', '');
      }
    });
    expect(
      parseExcel(buffer).every((row) => !row.questionId && !row.errors.length),
    ).toBe(true);
  });

  it.each([
    ['TRUE_FALSE', 'answersForCorrectAnswerForTrueFalse', 'yes'],
    ['MULTIPLE_CHOICE', 'answersForMultipleChoiceIsCorrect', 'FALSE\nFALSE'],
    ['MULTIPLE_CHOICE', 'answersForMultipleChoiceIsCorrect', 'TRUE'],
    ['MATCHING', 'answersForMatchingRightItem', 'a\nb'],
    [
      'MULTIPLE_SHORT_ANSWER',
      'answersForMultipleShortAnswerOrderIndex',
      '0\n0\n3',
    ],
    ['SHORT_ANSWER', 'answersForShortAnswer', 'a\n\nb'],
    ['INTERVIEW', 'answersForInterview', ''],
    ['TRUE_FALSE', 'questionId', '9007199254740993'],
    ['TRUE_FALSE', 'unitId', '1.5'],
  ])(
    'reports an invalid %s / %s with the real row number',
    (type, field, value) => {
      const buffer = editWorkbook(original, (workbook) =>
        setField(workbook.Sheets[type], field, value),
      );
      expect(
        parseExcel(buffer).find((row) => row.sheet === type),
      ).toMatchObject({ row: 2, status: 'error', errors: expect.any(Array) });
    },
  );

  it('skips empty physical rows and does not use the first sheet as README', () => {
    const buffer = editWorkbook(original, (workbook) => {
      workbook.SheetNames = ['TRUE_FALSE'];
      const sheet = workbook.Sheets.TRUE_FALSE;
      for (const key of Object.keys(sheet))
        if (/^[A-Z]+2$/.test(key)) {
          sheet[key.replace('2', '8')] = sheet[key];
          delete sheet[key];
        }
      sheet['!ref'] = 'A1:H8';
    });
    expect(parseExcel(buffer)).toHaveLength(1);
    expect(parseExcel(buffer)[0].row).toBe(8);
  });

  it('rejects formulas, missing headers, unknown sheets and empty workbooks', () => {
    const formula = editWorkbook(original, (workbook) => {
      workbook.Sheets.TRUE_FALSE.C2.f = '1+1';
    });
    expect(parseExcel(formula)[0].errors).toContain(
      '수식 대신 값을 입력하세요.',
    );
    const missing = editWorkbook(original, (workbook) => {
      delete workbook.Sheets.TRUE_FALSE.A1;
    });
    expect(parseExcel(missing)[0].errors).toContain('필수 컬럼 누락: unitId');
    const unknown = editWorkbook(original, (workbook) => {
      workbook.SheetNames.push('UNKNOWN');
      workbook.Sheets.UNKNOWN = XLSX.utils.aoa_to_sheet([
        ['type'],
        ['UNKNOWN'],
      ]);
    });
    expect(parseExcel(unknown).at(-1).status).toBe('error');
    expect(() => parseExcel(exportExcel([], []))).toThrow(
      '업로드할 문제가 없습니다.',
    );
  });

  it('rejects more than 10,000 populated rows', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [
          'unitId',
          'type',
          'title',
          'explanation',
          'additionalText',
          'answersForCorrectAnswerForTrueFalse',
        ],
        ...Array.from({ length: 10001 }, () => [
          1,
          'TRUE_FALSE',
          '문제',
          '',
          '',
          false,
        ]),
      ]),
      'TRUE_FALSE',
    );
    expect(() =>
      parseExcel(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })),
    ).toThrow('10,000');
  });
});
