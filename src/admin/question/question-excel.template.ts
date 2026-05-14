import { QuestionType } from 'src/common/constants/question-type.enum';

export const QUESTION_EXCEL_SHEET_ORDER = [
  'README',
  'MULTIPLE_CHOICE_ANSWER',
  'TRUE_FALSE',
  'MULTIPLE_CHOICE',
  'MATCHING',
  'SHORT_ANSWER',
  'MULTIPLE_SHORT_ANSWER',
  'INTERVIEW',
] as const;

export const QUESTION_EXCEL_COMMON_HEADERS = [
  'questionId',
  'unitId',
  'type',
  'title',
  'explanation',
  'additionalText',
] as const;

type SheetDefinition = {
  sheetName: (typeof QUESTION_EXCEL_SHEET_ORDER)[number];
  type?: QuestionType;
  headers: string[];
  sampleRows: Array<Record<string, string | number | null>>;
};

export const QUESTION_EXCEL_SHEETS: SheetDefinition[] = [
  {
    sheetName: 'README',
    headers: ['항목', '설명'],
    sampleRows: [
      {
        항목: '사용 가이드',
        설명:
          '시트 구성:\n' +
          '• TRUE_FALSE: 진위형 문제\n' +
          '• MULTIPLE_CHOICE: 선다형 문제\n' +
          '• MULTIPLE_CHOICE_ANSWER: 보기 입력형 문제\n' +
          '• MATCHING: 연결형 문제\n' +
          '• SHORT_ANSWER: 단답형 문제\n' +
          '• MULTIPLE_SHORT_ANSWER: 다중 단답형 문제\n' +
          '• INTERVIEW: 면접형 문제\n\n' +
          '공통 규칙:\n' +
          '• questionId가 비어 있으면 신규 생성, 값이 있으면 기존 문제 수정입니다.\n' +
          '• 하위 항목 ID 컬럼은 비교와 순서 매칭용입니다. 임의 변경 또는 삭제 시 충돌이 발생할 수 있습니다.\n' +
          '• 검색결과 엑셀 다운로드는 현재 질문 목록의 검색 조건만 반영합니다.\n' +
          '• 사진 업로드는 문제 등록 후 별도로 진행합니다.',
      },
    ],
  },
  {
    sheetName: 'MULTIPLE_CHOICE_ANSWER',
    type: QuestionType.MULTIPLE_CHOICE_INPUT,
    headers: [
      ...QUESTION_EXCEL_COMMON_HEADERS,
      'answersForMultipleChoiceIds',
      'answersForMultipleChoice',
      'answersForMultipleChoiceIsCorrect',
    ],
    sampleRows: [
      {
        questionId: null,
        unitId: 1,
        type: QuestionType.MULTIPLE_CHOICE_INPUT,
        title: '전기적 신호를 기계적 동작으로 변환하는 장치는?',
        explanation:
          '액추에이터는 전기적 신호를 받아 물리적 동작을 발생시키는 장치이다.',
        additionalText: '',
        answersForMultipleChoiceIds: '',
        answersForMultipleChoice: '센서\n액추에이터\n컨트롤러\n인버터',
        answersForMultipleChoiceIsCorrect: 'FALSE\nTRUE\nFALSE\nFALSE',
      },
    ],
  },
  {
    sheetName: 'TRUE_FALSE',
    type: QuestionType.TRUE_FALSE,
    headers: [
      ...QUESTION_EXCEL_COMMON_HEADERS,
      'answersForCorrectAnswerForTrueFalse',
    ],
    sampleRows: [
      {
        questionId: null,
        unitId: 1,
        type: QuestionType.TRUE_FALSE,
        title: '액추에이터는 전기적 신호를 기계적 동작으로 변환하는 장치이다.',
        explanation: '모터, 실린더 등이 대표적이다.',
        additionalText: '',
        answersForCorrectAnswerForTrueFalse: 'TRUE',
      },
    ],
  },
  {
    sheetName: 'MULTIPLE_CHOICE',
    type: QuestionType.MULTIPLE_CHOICE,
    headers: [
      ...QUESTION_EXCEL_COMMON_HEADERS,
      'answersForMultipleChoiceIds',
      'answersForMultipleChoice',
      'answersForMultipleChoiceIsCorrect',
    ],
    sampleRows: [
      {
        questionId: null,
        unitId: 1,
        type: QuestionType.MULTIPLE_CHOICE,
        title: '과전류가 흐를 때 회로를 자동 차단하는 장치는?',
        explanation: '차단기는 일정 이상 전류가 흐르면 회로를 차단한다.',
        additionalText: '',
        answersForMultipleChoiceIds: '',
        answersForMultipleChoice: '퓨즈\n차단기\n리미터\n컨버터',
        answersForMultipleChoiceIsCorrect: 'FALSE\nTRUE\nFALSE\nFALSE',
      },
    ],
  },
  {
    sheetName: 'MATCHING',
    type: QuestionType.MATCHING,
    headers: [
      ...QUESTION_EXCEL_COMMON_HEADERS,
      'answersForMatchingLeftItemIds',
      'answersForMatchingRightItemIds',
      'answersForMatchingLeftItem',
      'answersForMatchingRightItem',
    ],
    sampleRows: [
      {
        questionId: null,
        unitId: 1,
        type: QuestionType.MATCHING,
        title: '다음 용어와 의미를 올바르게 연결하시오.',
        explanation: '각 줄의 좌측과 우측 항목이 같은 순서로 연결된다.',
        additionalText: '',
        answersForMatchingLeftItemIds: '',
        answersForMatchingRightItemIds: '',
        answersForMatchingLeftItem: '액추에이터\nUPS\n배선용 차단기',
        answersForMatchingRightItem:
          '전기 신호를 기계 동작으로 변환\n정전 시 일정 시간 전력 공급\n과전류 발생 시 회로 차단',
      },
    ],
  },
  {
    sheetName: 'SHORT_ANSWER',
    type: QuestionType.SHORT_ANSWER,
    headers: [
      ...QUESTION_EXCEL_COMMON_HEADERS,
      'answersForShortAnswerIds',
      'answersForShortAnswer',
    ],
    sampleRows: [
      {
        questionId: null,
        unitId: 1,
        type: QuestionType.SHORT_ANSWER,
        title: '정전 시에도 일정 시간 전력을 공급하는 장치를 무엇이라 하는가?',
        explanation: '무정전 전원장치로 데이터 손실을 방지한다.',
        additionalText: '',
        answersForShortAnswerIds: '',
        answersForShortAnswer: 'UPS',
      },
    ],
  },
  {
    sheetName: 'MULTIPLE_SHORT_ANSWER',
    type: QuestionType.MULTIPLE_SHORT_ANSWER,
    headers: [
      ...QUESTION_EXCEL_COMMON_HEADERS,
      'answersForMultipleShortAnswerIds',
      'answersForMultipleShortAnswerContent',
      'answersForMultipleShortAnswerOrderIndex',
    ],
    sampleRows: [
      {
        questionId: null,
        unitId: 2,
        type: QuestionType.MULTIPLE_SHORT_ANSWER,
        title: '감전예방을 위해 인체 전류 I를 줄이려면 저항을 {0}하고 전압을 {1}한다.',
        explanation: '중괄호 번호와 orderIndex를 맞춰 입력한다.',
        additionalText: '',
        answersForMultipleShortAnswerIds: '',
        answersForMultipleShortAnswerContent: '높이고\n낮춘다',
        answersForMultipleShortAnswerOrderIndex: '0\n1',
      },
    ],
  },
  {
    sheetName: 'INTERVIEW',
    type: QuestionType.INTERVIEW,
    headers: [...QUESTION_EXCEL_COMMON_HEADERS, 'answersForInterview'],
    sampleRows: [
      {
        questionId: null,
        unitId: 9,
        type: QuestionType.INTERVIEW,
        title: '작업안전관리의 정의와 필요성에 대해 설명해보세요.',
        explanation: '사람, 설비, 환경, 절차를 함께 관리해야 한다.',
        additionalText: '',
        answersForInterview:
          '작업 중 발생할 수 있는 사고를 예방하고 근로자의 생명과 건강을 보호하기 위한 체계적 관리 활동이다.',
      },
    ],
  },
];
