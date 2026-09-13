import { join } from 'path';
import { readFileSync } from 'fs';
import { DataSource, EntityManager } from 'typeorm';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AdminQuestionController } from './admin.question.controller';
import { AdminQuestionService } from './admin.question.service';
import { AdminUploadService } from '../upload/admin.upload.service';
import { AdminAuthGuard } from 'src/common/guards/admin-auth.guard';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { CustomValidationPipe } from 'src/common/pipes/validation.pipe';
import { AdminQuestionExcelService } from './admin.question-excel.service';
import { Question } from 'src/entities/question.entity';
import { Answer } from 'src/entities/answer.entity';
import { Unit } from 'src/entities/unit.entity';
import { User } from 'src/entities/user.entity';
import { PhotoMap } from 'src/entities/photo-map.entity';
import { QuestionWrong } from 'src/entities/question-wrong.entity';
import { QuestionSession } from 'src/entities/question-session.entity';
import { QuestionSessionMap } from 'src/entities/question-session-map.entity';
import { QuestionExcelBatch } from 'src/entities/question-excel-batch.entity';
import { SessionType } from 'src/common/constants/session-type.enum';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { QuestionRepository } from 'src/repositories/question.repository';
import { QuestionSessionRepository } from 'src/repositories/question-session.repository';
import { QuestionSessionMapRepository } from 'src/repositories/question-session-map.repository';
import { QuestionWrongRepository } from 'src/repositories/question-wrong.repository';
import { AppQuestionSessionService } from 'src/app/question/session/app.question-session.service';
import { AppQuestionSharedService } from 'src/app/question/app.question-shared.service';
import {
  editWorkbook,
  excelFile,
  fixture,
  setField,
} from './testing/question-excel.fixture';
import { exportExcel } from './question-excel.codec';

// Explicitly opt in to a disposable local DB. Never load application .env credentials.
const describeMysql =
  process.env.QUESTION_EXCEL_TEST_DB === 'cbt_excel_test'
    ? describe
    : describe.skip;
describeMysql('Question Excel isolated MySQL integration', () => {
  jest.setTimeout(120000);
  let db: DataSource;
  let service: AdminQuestionExcelService;
  let adminService: AdminQuestionService;
  let app: INestApplication;
  let original: Buffer;
  const { questions, answers } = fixture();
  beforeAll(async () => {
    db = new DataSource({
      type: 'mysql',
      host: '127.0.0.1',
      port: Number(process.env.QUESTION_EXCEL_TEST_PORT || 33316),
      username: 'root',
      password: 'cbt-excel-local-test',
      database: 'cbt_excel_test',
      entities: [join(__dirname, '../../entities/*.entity.ts')],
      synchronize: true,
    });
    await db.initialize();
    service = new AdminQuestionExcelService(db.manager);
    adminService = new AdminQuestionService(
      new QuestionRepository(db.getRepository(Question)),
      new AnswerRepository(db.getRepository(Answer)),
      {} as any,
      db.manager,
      {
        findByQuestionId: (questionId) =>
          db.manager.find(PhotoMap, { where: { questionId } }),
      } as any,
      {} as any,
    );
    const module = await Test.createTestingModule({
      controllers: [AdminQuestionController],
      providers: [
        { provide: AdminQuestionExcelService, useValue: service },
        { provide: AdminQuestionService, useValue: adminService },
        { provide: AdminUploadService, useValue: {} },
      ],
    })
      .overrideGuard(AdminAuthGuard)
      .useValue({
        canActivate: (context) => {
          context.switchToHttp().getRequest().user = { sub: 1 };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalPipes(new CustomValidationPipe());
    await app.init();
  });
  afterAll(async () => {
    if (app) await app.close();
    if (db?.isInitialized) await db.destroy();
  });
  beforeEach(async () => {
    await db.synchronize(true);
    await db.manager.save(Unit, [
      { id: 1, name: 'Unit A' },
      { id: 2, name: 'Unit B' },
    ]);
    await db.manager.save(
      Question,
      questions.map((q) => ({ ...q })),
    );
    await db.manager.save(
      Answer,
      answers.map((a) => ({ ...a })),
    );
    await db.manager.save(User, {
      id: 1,
      name: '테스트',
      phone: 'test-001',
      password: 'not-a-real-user',
    });
    await db.manager.save(QuestionSession, {
      id: 1,
      userId: 1,
      type: SessionType.UNIT,
      referenceId: 1,
    });
    await db.manager.save(PhotoMap, {
      key: 'test/question/photo',
      questionId: 2,
      originalName: 'test.png',
      orderIndex: 0,
    });
    await db.manager.save(QuestionWrong, {
      questionId: 2,
      userId: 1,
      wrongCount: 3,
      lastWrongAt: new Date('2026-01-01'),
      isReviewed: true,
    });
    await db.manager.save(QuestionSessionMap, {
      questionId: 2,
      userId: 1,
      questionSessionId: 1,
      isCorrect: false,
      isOpened: true,
      answeredAt: new Date('2026-01-01'),
      userAnswer: {
        type: QuestionType.MULTIPLE_CHOICE,
        answersForMultipleChoice: [
          answers.find((a) => a.questionId === 2 && !a.isCorrect).id,
        ],
      },
    });
    original = await service.download('1,2');
  });

  const history = async () => ({
    photos: await db.manager.find(PhotoMap),
    wrongs: await db.manager.find(QuestionWrong),
    maps: await db.manager.find(QuestionSessionMap),
    sessions: await db.manager.find(QuestionSession),
  });

  it('round-trips seven types as unchanged, retains all IDs and history, and filters downloads by Unit only', async () => {
    const before = await history();
    const preview = await service.preview(1, excelFile(original));
    expect(preview.counts).toEqual({
      new: 0,
      updated: 0,
      unchanged: 7,
      error: 0,
      warning: 0,
    });
    const result = await service.commit(1, { previewId: preview.previewId });
    expect(result).toMatchObject({ created: 0, updated: 0, unchanged: 7 });
    expect(await history()).toEqual(before);
    const selected = await service.preview(
      1,
      excelFile(await service.download('1')),
    );
    expect(selected.rows.every((row) => row.unitId === 1)).toBe(true);
    expect(selected.rows).toHaveLength(4);
    expect(await db.manager.count(Question)).toBe(7);
    await expect(service.download('1,999')).rejects.toThrow('능력단위');
  });

  it('updates all seven types and preserves answer IDs, pairings, photo mapping, submitted answers and scores', async () => {
    const beforeHistory = await history();
    const beforeAnswers = await db.manager.find(Answer, {
      order: { id: 'ASC' },
    });
    const edited = editWorkbook(original, (workbook) => {
      for (const q of questions) {
        setField(workbook.Sheets[q.type], 'explanation', '수정 해설');
        setField(workbook.Sheets[q.type], 'additionalText', '추가');
      }
      setField(
        workbook.Sheets.TRUE_FALSE,
        'answersForCorrectAnswerForTrueFalse',
        'TRUE',
      );
      setField(
        workbook.Sheets.MULTIPLE_CHOICE,
        'answersForMultipleChoice',
        '수정 보기 1\n수정 보기 2',
      );
      setField(
        workbook.Sheets.MULTIPLE_CHOICE,
        'answersForMultipleChoiceIsCorrect',
        'FALSE\nTRUE',
      );
      setField(
        workbook.Sheets.MULTIPLE_CHOICE_INPUT,
        'answersForMultipleChoiceIsCorrect',
        'TRUE\nTRUE',
      );
      setField(
        workbook.Sheets.MATCHING,
        'answersForMatchingRightItem',
        '수정된 오른쪽',
      );
      setField(
        workbook.Sheets.SHORT_ANSWER,
        'answersForShortAnswer',
        '새 정답',
      );
      setField(
        workbook.Sheets.MULTIPLE_SHORT_ANSWER,
        'answersForMultipleShortAnswerContent',
        '새 정답 0\n대체 0\n새 정답 1',
      );
      setField(
        workbook.Sheets.INTERVIEW,
        'answersForInterview',
        '새 답변\n두 번째 문단',
      );
      setField(workbook.Sheets.INTERVIEW, 'explanation', '');
    });
    const preview = await service.preview(1, excelFile(edited));
    expect(preview.counts).toMatchObject({ updated: 7, error: 0 });
    await service.commit(1, { previewId: preview.previewId });
    const afterAnswers = await db.manager.find(Answer, {
      order: { id: 'ASC' },
    });
    expect(
      afterAnswers.map((a) => [
        a.id,
        a.questionId,
        a.pairingAnswerId,
        a.orderIndex,
      ]),
    ).toEqual(
      beforeAnswers.map((a) => [
        a.id,
        a.questionId,
        a.pairingAnswerId,
        a.orderIndex,
      ]),
    );
    expect(await history()).toEqual(beforeHistory);
    expect(
      (await db.manager.findOneBy(Question, { id: 7 })).explanation,
    ).toBeNull();
    const shared = new AppQuestionSharedService(
      new AnswerRepository(db.getRepository(Answer)),
    );
    const details = await shared.getCorrectAnswerDetails(
      await db.manager.findOneBy(Question, { id: 2 }),
      beforeHistory.maps[0].userAnswer,
    );
    expect(details.userAnswerMapped).toBe('수정 보기 2');
    expect(details.answer).toBe('수정 보기 2');
    expect((await db.manager.find(QuestionSessionMap))[0].isCorrect).toBe(
      false,
    );
  });

  it('adds legacy rows alongside updates and commits a batch exactly once under concurrent requests and retries', async () => {
    const edited = editWorkbook(original, (workbook) => {
      setField(workbook.Sheets.TRUE_FALSE, 'title', '수정된 본문');
      setField(workbook.Sheets.INTERVIEW, 'questionId', '');
      setField(workbook.Sheets.INTERVIEW, '_originalHash', '');
      setField(workbook.Sheets.INTERVIEW, 'title', '신규 면접 문제');
    });
    const preview = await service.preview(1, excelFile(edited));
    expect(preview.counts).toMatchObject({
      new: 1,
      updated: 1,
      unchanged: 5,
      error: 0,
    });
    const results = await Promise.all([
      service.commit(1, { previewId: preview.previewId }),
      service.commit(1, { previewId: preview.previewId }),
    ]);
    expect(results[0]).toEqual(results[1]);
    expect(await service.commit(1, { previewId: preview.previewId })).toEqual(
      results[0],
    );
    expect(await db.manager.count(Question)).toBe(8);
    expect(await db.manager.findOneBy(Question, { id: 7 })).toBeDefined();
  });

  it('does not delete omitted rows or permit a different admin to commit a batch', async () => {
    const edited = editWorkbook(original, (workbook) => {
      workbook.SheetNames = ['TRUE_FALSE'];
    });
    const preview = await service.preview(1, excelFile(edited));
    await expect(
      service.commit(2, { previewId: preview.previewId }),
    ).rejects.toThrow('검토 결과');
    await service.commit(1, { previewId: preview.previewId });
    expect(await db.manager.count(Question)).toBe(7);
  });

  it.each([
    ['questionId', '999', '기존 문제'],
    ['_originalHash', '', '원본 검증'],
    ['unitId', '1', '능력단위'],
    ['answersForMultipleChoice', 'a\nb\nc', '줄 수'],
  ])(
    'blocks invalid existing %s without changes',
    async (field, value, message) => {
      const edited = editWorkbook(original, (workbook) =>
        setField(workbook.Sheets.MULTIPLE_CHOICE, field, value),
      );
      const preview = await service.preview(1, excelFile(edited));
      expect(preview.counts.error).toBeGreaterThan(0);
      expect(preview.rows.flatMap((row) => row.errors).join(' ')).toContain(
        message,
      );
      await expect(
        service.commit(1, { previewId: preview.previewId }),
      ).rejects.toThrow('오류');
      expect(await db.manager.count(Question)).toBe(7);
    },
  );

  it('rejects duplicate IDs, type changes, added choices and changed blank structure', async () => {
    const edited = editWorkbook(original, (workbook) => {
      setField(workbook.Sheets.TRUE_FALSE, 'questionId', '2');
      setField(workbook.Sheets.MULTIPLE_CHOICE_INPUT, 'questionId', '4');
      setField(
        workbook.Sheets.MULTIPLE_CHOICE,
        'answersForMultipleChoice',
        'a\nb\nc',
      );
      setField(
        workbook.Sheets.MULTIPLE_CHOICE,
        'answersForMultipleChoiceIsCorrect',
        'TRUE\nFALSE\nFALSE',
      );
      setField(
        workbook.Sheets.MULTIPLE_SHORT_ANSWER,
        'answersForMultipleShortAnswerOrderIndex',
        '0\n1\n1',
      );
    });
    const preview = await service.preview(1, excelFile(edited));
    const errors = preview.rows.flatMap((row) => row.errors).join(' ');
    expect(errors).toContain('같은 questionId');
    expect(errors).toContain('유형');
    expect(errors).toContain('개수');
    expect(errors).toContain('빈칸 번호별');
    const unitSummary = preview.units.find((unit) => unit.unitId === 2);
    expect(unitSummary.error).toBeGreaterThan(0);
  });

  it('serves binary downloads and makes both upload routes preview-only with validated commit requests', async () => {
    const response = await request(app.getHttpServer())
      .get('/admin/questions/excel?unitIds=1')
      .expect(200);
    expect(response.headers['content-type']).toContain('spreadsheetml.sheet');
    expect(response.headers['content-disposition']).toContain('questions.xlsx');
    await request(app.getHttpServer())
      .post('/admin/questions/excel/preview')
      .expect(400);
    const oldRoute = await request(app.getHttpServer())
      .post('/admin/questions/excel')
      .attach('file', original, 'questions.xlsx')
      .expect(201);
    expect(oldRoute.body.data.counts.unchanged).toBe(7);
    expect(await db.manager.count(Question)).toBe(7);
    const preview = await request(app.getHttpServer())
      .post('/admin/questions/excel/preview')
      .attach('file', original, 'questions.xlsx')
      .expect(201);
    const committed = await request(app.getHttpServer())
      .post('/admin/questions/excel/commit')
      .send({ previewId: preview.body.data.previewId })
      .expect(201);
    expect(committed.body.data.unchanged).toBe(7);
    const invalid = await request(app.getHttpServer())
      .post('/admin/questions/excel/commit')
      .send({ previewId: 'not-a-uuid' });
    expect(invalid.body.code).not.toBe(200);
  });

  it('requires acknowledging duplicate new rows instead of silently overwriting an existing question', async () => {
    const edited = editWorkbook(original, (workbook) => {
      workbook.SheetNames = ['INTERVIEW'];
      setField(workbook.Sheets.INTERVIEW, 'questionId', '');
      setField(workbook.Sheets.INTERVIEW, '_originalHash', '');
    });
    const preview = await service.preview(1, excelFile(edited));
    expect(preview.counts).toMatchObject({ new: 1, warning: 1, error: 0 });
    await expect(
      service.commit(1, { previewId: preview.previewId }),
    ).rejects.toThrow('경고');
    await service.commit(1, {
      previewId: preview.previewId,
      acknowledgeWarnings: true,
    });
    expect(await db.manager.count(Question)).toBe(8);
  });

  it('rejects stale downloads, changes after preview and expired batches', async () => {
    const preview = await service.preview(1, excelFile(original));
    await db.manager.update(Answer, answers[0].id, { isCorrect: true });
    await expect(
      service.commit(1, { previewId: preview.previewId }),
    ).rejects.toThrow('검토 후 문제가 변경');
    const stale = await service.preview(1, excelFile(original));
    expect(stale.counts.error).toBe(1);
    const fresh = await service.preview(
      1,
      excelFile(await service.download('1,2')),
    );
    await db.manager.update(QuestionExcelBatch, fresh.previewId, {
      expiresAt: new Date('2020-01-01'),
    });
    await expect(
      service.commit(1, { previewId: fresh.previewId }),
    ).rejects.toThrow('만료');
  });

  it('rolls back question and answer updates and batch completion on a late database failure', async () => {
    const edited = editWorkbook(original, (workbook) => {
      setField(workbook.Sheets.TRUE_FALSE, 'title', '변경');
      setField(
        workbook.Sheets.TRUE_FALSE,
        'answersForCorrectAnswerForTrueFalse',
        true,
      );
    });
    const preview = await service.preview(1, excelFile(edited));
    const failing = new AdminQuestionExcelService({
      transaction: (callback) =>
        db.manager.transaction(async (manager) => {
          const realUpdate = manager.update.bind(manager);
          manager.update = ((target, ...args) => {
            if (target === QuestionExcelBatch)
              throw new Error('simulated final write failure');
            return realUpdate(target, ...args);
          }) as EntityManager['update'];
          return callback(manager);
        }),
    } as EntityManager);
    await expect(
      failing.commit(1, { previewId: preview.previewId }),
    ).rejects.toThrow('simulated');
    expect((await db.manager.findOneBy(Question, { id: 1 })).title).toBe(
      questions[0].title,
    );
    expect(
      (await db.manager.findOneBy(Answer, { id: answers[0].id })).isCorrect,
    ).toBe(false);
    expect(
      (
        await db.manager.findOneBy(QuestionExcelBatch, {
          id: preview.previewId,
        })
      ).result,
    ).toBeNull();
    await expect(
      service.commit(1, { previewId: preview.previewId }),
    ).resolves.toMatchObject({ updated: 1 });
  });

  it('rejects a duplicate inserted after preview instead of registering another copy unnoticed', async () => {
    const q = Object.assign(new Question(), {
      ...questions[0],
      id: 99,
      title: '새 문제',
    });
    const a = Object.assign(new Answer(), {
      ...answers[0],
      id: 999,
      questionId: 99,
    });
    const buffer = editWorkbook(exportExcel([q], [a]), (workbook) => {
      setField(workbook.Sheets.TRUE_FALSE, 'questionId', '');
      setField(workbook.Sheets.TRUE_FALSE, '_originalHash', '');
    });
    const preview = await service.preview(1, excelFile(buffer));
    await db.manager.save(Question, q);
    await db.manager.save(Answer, a);
    await expect(
      service.commit(1, { previewId: preview.previewId }),
    ).rejects.toThrow('동일한 문제가 등록');
  });

  it('uses the current answers after waiting for a concurrent edit, even with an earlier repeatable-read snapshot', async () => {
    const repository = new AnswerRepository(db.getRepository(Answer));
    await db.manager.transaction(async (manager) => {
      await manager.findOneBy(Question, { id: 2 });
      const answer = answers.find((item) => item.questionId === 2);
      await db.manager.update(Answer, answer.id, {
        content: '동시 수정된 보기',
      });
      const current = await repository.findByQuestionId(2, manager);
      expect(
        current.find((item) => Number(item.id) === answer.id).content,
      ).toBe('동시 수정된 보기');
    });
  });

  it('saves edited short answers and grades the updated alternatives through the real admin API', async () => {
    const answer = answers.find((item) => item.questionId === 5);
    await db.manager.update(Answer, answer.id, {
      content: '자재 목록표(bill of material)',
      isCorrect: false,
    });
    const response = await request(app.getHttpServer())
      .put('/admin/questions/5')
      .send({
        title: questions[4].title,
        explanation: '수정',
        answersForShortAnswers: [
          { id: answer.id, content: '자재 목록표' },
          { id: null, content: 'BOM' },
        ],
      })
      .expect(200);
    expect(
      response.body.data.correctAnswers.map((item) => item.content),
    ).toEqual(['자재 목록표', 'BOM']);
    expect(response.body.data.correctAnswers[0].id).toBe(answer.id);
    const shared = new AppQuestionSharedService(
      new AnswerRepository(db.getRepository(Answer)),
    );
    const question = await db.manager.findOneBy(Question, { id: 5 });
    for (const content of ['자재 목록표', 'BOM']) {
      expect(
        (
          await shared.isAnswerCorrect(question, {
            type: QuestionType.SHORT_ANSWER,
            answersForShortAnswer: content,
          } as any)
        ).isCorrect,
      ).toBe(true);
    }
    expect(
      (
        await shared.isAnswerCorrect(question, {
          type: QuestionType.SHORT_ANSWER,
          answersForShortAnswer: '자재 목록표(bill of material)',
        } as any)
      ).isCorrect,
    ).toBe(false);
    const loaded = await request(app.getHttpServer())
      .get('/admin/questions/5')
      .expect(200);
    expect(loaded.body.data.correctAnswers).toEqual(
      response.body.data.correctAnswers,
    );
  });

  it('rejects invalid short answer IDs and empty answer lists without silently saving the title', async () => {
    await expect(
      adminService.update(5, {
        title: '저장되면 안 되는 제목',
        answersForShortAnswers: [{ id: 99999, content: '정답' }],
      }),
    ).rejects.toThrow('정답 ID');
    await expect(
      adminService.update(5, {
        title: '저장되면 안 되는 제목',
        answersForShortAnswers: [],
      }),
    ).rejects.toThrow('하나 이상');
    expect((await db.manager.findOneBy(Question, { id: 5 })).title).toBe(
      questions[4].title,
    );
  });

  it('bulk deletes only selected questions while preserving photos, answers and historical session results', async () => {
    const before = await history();
    const preview = await service.preview(1, excelFile(original));
    const deleted = await request(app.getHttpServer())
      .delete('/admin/questions/bulk')
      .send({ questionIds: [2, 4] })
      .expect(200);
    expect(deleted.body.data).toEqual({
      deletedCount: 2,
      alreadyDeletedCount: 0,
    });
    expect(await db.manager.count(Question)).toBe(5);
    expect(await db.manager.count(Question, { withDeleted: true })).toBe(7);
    expect(await db.manager.count(Answer)).toBe(answers.length);
    expect(await history()).toEqual(before);
    const query = new QuestionRepository(db.getRepository(Question));
    expect(await query.findById(2)).toBeNull();
    const wrongs = new QuestionWrongRepository(db.getRepository(QuestionWrong));
    await db.manager.update(QuestionWrong, before.wrongs[0].id, {
      isReviewed: false,
    });
    expect((await wrongs.findAndCountNotReviewByUserId(1, 1, 20, {}))[1]).toBe(
      0,
    );
    expect(
      (await wrongs.findByUserIdAndWrongId(1, before.wrongs[0].id)).question,
    ).toBeNull();
    const maps = new QuestionSessionMapRepository(
      db.getRepository(QuestionSessionMap),
    );
    expect(await maps.getQuestionIdsBySessionId(1)).toEqual([]);
    expect(
      (await maps.countPreviousAndNextBySessionId(1, before.maps[0].id))
        .totalQuestionCount,
    ).toBe(0);
    const sessions = new AppQuestionSessionService(
      new QuestionSessionRepository(db.getRepository(QuestionSession)),
      maps,
      { getElapsedMs: async () => 0 } as any,
      query,
      {} as any,
      {} as any,
      new AppQuestionSharedService(
        new AnswerRepository(db.getRepository(Answer)),
      ),
      db.manager,
    );
    const result = await sessions.getSessionResult(1, 1);
    expect(result.totalQuestions).toBe(1);
    expect(result.correctAnswers).toBe(0);
    expect(result.results[0].title).toBe(questions[1].title);
    expect(result.results[0].isCorrect).toBe(false);
    await expect(
      service.commit(1, { previewId: preview.previewId }),
    ).rejects.toThrow('검토 후 문제가 변경');
    expect(await adminService.deleteMany([2, 4])).toEqual({
      deletedCount: 0,
      alreadyDeletedCount: 2,
    });
  });

  it('blocks invalid bulk deletion requests and does not partially delete a selection with an unknown ID', async () => {
    const empty = await request(app.getHttpServer())
      .delete('/admin/questions/bulk')
      .send({ questionIds: [] });
    expect(empty.body.code).not.toBe(200);
    await expect(adminService.deleteMany([2, 99999])).rejects.toThrow(
      '존재하지 않는',
    );
    expect(await db.manager.count(Question)).toBe(7);
  });

  it('round-trips multiple-short-answer legacy empty alternatives, then edits the correct answer IDs', async () => {
    const real = await db.manager.find(Answer, {
      where: { questionId: 6 },
      order: { id: 'ASC' },
    });
    const empty = await db.manager.save(Answer, {
      questionId: 6,
      content: '',
      orderIndex: 0,
      isCorrect: true,
    });
    const exported = await service.download('1,2');
    const preview = await service.preview(1, excelFile(exported));
    expect(preview.counts).toMatchObject({
      unchanged: 7,
      error: 0,
      updated: 0,
    });
    const oldFile = editWorkbook(exported, (workbook) => {
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
    const legacy = await service.preview(1, excelFile(oldFile));
    expect(legacy.counts).toMatchObject({ unchanged: 7, error: 0 });
    await service.commit(1, { previewId: legacy.previewId });
    const edited = editWorkbook(exported, (workbook) => {
      setField(
        workbook.Sheets.MULTIPLE_SHORT_ANSWER,
        'answersForMultipleShortAnswerContent',
        '수정 0\n수정 대체 0\n수정 1',
      );
    });
    const update = await service.preview(1, excelFile(edited));
    expect(update.counts).toMatchObject({ updated: 1, error: 0 });
    await service.commit(1, { previewId: update.previewId });
    const stored = await db.manager.find(Answer, {
      where: { questionId: 6 },
      order: { id: 'ASC' },
    });
    expect(stored.map((a) => String(a.id))).toEqual([
      ...real.map((a) => String(a.id)),
      String(empty.id),
    ]);
    expect(stored.map((a) => a.content)).toEqual([
      '수정 0',
      '수정 대체 0',
      '수정 1',
      '',
    ]);
    expect(
      (await service.preview(1, excelFile(await service.download('1,2'))))
        .counts,
    ).toMatchObject({ unchanged: 7, error: 0 });
  });

  it('rejects new empty multiple-short-answer entries in the admin editor and rolls back the edit', async () => {
    const real = await db.manager.find(Answer, {
      where: { questionId: 6 },
      order: { id: 'ASC' },
    });
    const dtos = real.map((answer) => ({
      id: Number(answer.id),
      content: answer.content,
      orderIndex: answer.orderIndex,
    }));
    await expect(
      adminService.update(6, {
        title: '저장되면 안 되는 제목',
        answersForMultipleShortAnswer: [
          ...dtos,
          { id: null, content: '', orderIndex: 0 },
        ],
      }),
    ).rejects.toThrow('정답 내용');
    expect((await db.manager.findOneBy(Question, { id: 6 })).title).toBe(
      questions[5].title,
    );
    expect(await db.manager.count(Answer, { where: { questionId: 6 } })).toBe(
      real.length,
    );
  });

  const testAttachment = process.env.QUESTION_EXCEL_TEST_FILE ? it : it.skip;
  testAttachment(
    'checks the real V3 workbook at its full size, then imports valid rows and round-trips them',
    async () => {
      for (let id = 3; id <= 100; id++)
        await db.manager.save(Unit, { id, name: `Unit ${id}` });
      const preview = await service.preview(
        1,
        excelFile(readFileSync(process.env.QUESTION_EXCEL_TEST_FILE)),
      );
      expect(preview.rows.length).toBeGreaterThan(5000);
      // Source validation errors must be visible and must prevent partial import.
      if (preview.counts.error) {
        await expect(
          service.commit(1, {
            previewId: preview.previewId,
            acknowledgeWarnings: true,
          }),
        ).rejects.toThrow('오류');
        expect(await db.manager.count(Question)).toBe(7);
      }
      const batch = await db.manager.findOneBy(QuestionExcelBatch, {
        id: preview.previewId,
      });
      const validRows = batch.rows.filter((row) => row.status !== 'error');
      expect(validRows.length).toBeGreaterThan(5000);
      await db.manager.update(QuestionExcelBatch, batch.id, {
        rows: validRows,
      });
      const committed = await service.commit(1, {
        previewId: batch.id,
        acknowledgeWarnings: true,
      });
      expect(committed.created).toBe(validRows.length);
      const downloaded = await service.download(
        [...new Set(validRows.map((row) => row.unitId))].join(','),
      );
      const roundtrip = await service.preview(1, excelFile(downloaded));
      expect(roundtrip.counts.error).toBe(0);
      expect(roundtrip.counts.updated).toBe(0);
      expect(roundtrip.counts.unchanged).toBeGreaterThanOrEqual(
        validRows.length,
      );
    },
  );
});
