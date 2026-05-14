import { Injectable } from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import * as xlsx from 'xlsx';
import { EntityManager } from 'typeorm';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { Answer } from 'src/entities/answer.entity';
import { Question } from 'src/entities/question.entity';
import { QuestionRepository } from 'src/repositories/question.repository';
import { AnswerRepository } from 'src/repositories/answer.repository';
import {
  QUESTION_EXCEL_SHEETS,
  QUESTION_EXCEL_SHEET_ORDER,
} from './question-excel.template';
import {
  ParsedQuestionExcelChoiceAdminDto,
  ParsedQuestionExcelMatchingAdminDto,
  ParsedQuestionExcelRowAdminDto,
  PreviewQuestionExcelItemAdminDto,
  PreviewQuestionExcelResponseAdminDto,
  QuestionExcelChildDiffAdminDto,
  QuestionExcelFieldDiffAdminDto,
} from 'src/dtos/admin/question/excel-preview.admin.dto';
import { CommitQuestionExcelAdminDto } from 'src/dtos/admin/question/commit-question-excel.admin.dto';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { ErrorCodes } from 'src/common/constants/error-code.enum';

type QuestionSnapshot = {
  id: number;
  unitId: number;
  title: string;
  explanation: string | null;
  additionalText: string | null;
  type: QuestionType;
  answers: Answer[];
};

@Injectable()
export class AdminQuestionExcelService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  getTemplateBuffer() {
    const workbook = xlsx.utils.book_new();

    for (const sheetDefinition of QUESTION_EXCEL_SHEETS) {
      const rows =
        sheetDefinition.sheetName === 'README'
          ? sheetDefinition.sampleRows
          : sheetDefinition.sampleRows.map((row) => ({
              ...Object.fromEntries(
                sheetDefinition.headers.map((header) => [header, '']),
              ),
              ...row,
            }));

      const worksheet = xlsx.utils.json_to_sheet(rows, {
        header: sheetDefinition.headers,
        skipHeader: false,
      });

      xlsx.utils.book_append_sheet(workbook, worksheet, sheetDefinition.sheetName);
    }

    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async getExportBuffer(filters: {
    keyword?: string;
    unitIds?: number[];
    questionTypes?: QuestionType[];
  }) {
    const workbook = xlsx.utils.book_new();
    const questions = await this.questionRepository.findAllByFilters(filters);
    const questionIds = questions.map((question) => question.id);
    const snapshots = new Map<number, QuestionSnapshot>();

    for (const questionId of questionIds) {
      const snapshot = await this.getQuestionSnapshot(questionId);
      if (snapshot) {
        snapshots.set(questionId, snapshot);
      }
    }

    for (const sheetDefinition of QUESTION_EXCEL_SHEETS) {
      if (sheetDefinition.sheetName === 'README') {
        const worksheet = xlsx.utils.json_to_sheet(sheetDefinition.sampleRows, {
          header: sheetDefinition.headers,
          skipHeader: false,
        });
        xlsx.utils.book_append_sheet(
          workbook,
          worksheet,
          sheetDefinition.sheetName,
        );
        continue;
      }

      const rows = questions
        .filter(
          (question) =>
            this.mapSheetNameByQuestionType(question.type) ===
            sheetDefinition.sheetName,
        )
        .map((question) => {
          const snapshot = snapshots.get(question.id);
          return snapshot
            ? this.buildExportRow(snapshot, sheetDefinition.sheetName)
            : null;
        })
        .filter(Boolean);

      const worksheet = xlsx.utils.json_to_sheet(rows.length > 0 ? rows : [{}], {
        header: sheetDefinition.headers,
        skipHeader: false,
      });

      xlsx.utils.book_append_sheet(workbook, worksheet, sheetDefinition.sheetName);
    }

    const sortedWorkbook = xlsx.utils.book_new();
    for (const sheetName of QUESTION_EXCEL_SHEET_ORDER) {
      const sheet = workbook.Sheets[sheetName];
      if (sheet) {
        xlsx.utils.book_append_sheet(sortedWorkbook, sheet, sheetName);
      }
    }

    return xlsx.write(sortedWorkbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async preview(buffer: Buffer): Promise<PreviewQuestionExcelResponseAdminDto> {
    const parsedRows = this.parseWorkbook(buffer);
    const items: PreviewQuestionExcelItemAdminDto[] = [];

    for (const parsedRow of parsedRows) {
      items.push(await this.buildPreviewItem(parsedRow));
    }

    return {
      summary: {
        totalCount: items.length,
        createCount: items.filter((item) => item.status === 'create').length,
        updateCount: items.filter((item) => item.status === 'update').length,
        unchangedCount: items.filter((item) => item.status === 'unchanged').length,
        conflictCount: items.filter((item) => item.status === 'conflict').length,
      },
      items,
    };
  }

  async commit(body: CommitQuestionExcelAdminDto) {
    const items = (body.items || []).filter(
      (item) => item.selectedAction !== 'SKIP',
    );

    const conflicts = items.filter((item) => item.status === 'conflict');
    if (conflicts.length > 0) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }

    let createdCount = 0;
    let updatedCount = 0;

    await this.entityManager.transaction(async (manager) => {
      for (const item of items) {
        if (item.status === 'unchanged') {
          continue;
        }

        if (!item.questionId) {
          await this.createQuestion(manager, item.parsedData);
          createdCount += 1;
        } else {
          await this.updateQuestion(manager, item.parsedData);
          updatedCount += 1;
        }
      }
    });

    return {
      totalCount: items.length,
      createdCount,
      updatedCount,
    };
  }

  private parseWorkbook(buffer: Buffer) {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const parsedRows: ParsedQuestionExcelRowAdminDto[] = [];

    for (const sheetDefinition of QUESTION_EXCEL_SHEETS) {
      if (sheetDefinition.sheetName === 'README') {
        continue;
      }

      const worksheet = workbook.Sheets[sheetDefinition.sheetName];
      if (!worksheet) {
        continue;
      }

      const rows = xlsx.utils.sheet_to_json<Record<string, string>>(worksheet, {
        defval: '',
        raw: false,
      });

      rows.forEach((row, index) => {
        if (this.isEmptyRow(row)) {
          return;
        }

        parsedRows.push(
          this.parseRow(sheetDefinition.sheetName, row, index + 2),
        );
      });
    }

    return parsedRows;
  }

  private parseRow(
    sheetName: string,
    row: Record<string, string>,
    rowNumber: number,
  ): ParsedQuestionExcelRowAdminDto {
    const validationErrors: string[] = [];
    const type = this.parseQuestionType(
      row.type || this.mapQuestionTypeBySheetName(sheetName),
    );
    const parsedRow: ParsedQuestionExcelRowAdminDto = {
      sheetName,
      rowNumber,
      validationErrors,
      questionId: this.parseNullableNumber(row.questionId),
      unitId: this.parseRequiredNumber(row.unitId, 'unitId', validationErrors),
      type,
      title: (row.title || '').trim(),
      explanation: this.parseNullableString(row.explanation),
      additionalText: this.parseNullableString(row.additionalText),
    };

    switch (type) {
      case QuestionType.TRUE_FALSE:
        parsedRow.answersForCorrectAnswerForTrueFalse = this.parseBoolean(
          row.answersForCorrectAnswerForTrueFalse,
          'answersForCorrectAnswerForTrueFalse',
          validationErrors,
        );
        break;
      case QuestionType.INTERVIEW:
        parsedRow.answersForInterview = row.answersForInterview || '';
        break;
      case QuestionType.SHORT_ANSWER:
        parsedRow.answersForShortAnswers = this.parseLineItems(
          row.answersForShortAnswerIds,
          row.answersForShortAnswer,
        );
        break;
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        parsedRow.answersForMultipleShortAnswer = this.parseOrderedLineItems(
          row.answersForMultipleShortAnswerIds,
          row.answersForMultipleShortAnswerContent,
          row.answersForMultipleShortAnswerOrderIndex,
          validationErrors,
        );
        break;
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.MULTIPLE_CHOICE_INPUT:
        parsedRow.answersForMultipleChoice = this.parseMultipleChoices(
          row.answersForMultipleChoiceIds,
          row.answersForMultipleChoice,
          row.answersForMultipleChoiceIsCorrect,
          validationErrors,
        );
        break;
      case QuestionType.MATCHING:
        parsedRow.answersForMatching = this.parseMatchingItems(
          row.answersForMatchingLeftItemIds,
          row.answersForMatchingRightItemIds,
          row.answersForMatchingLeftItem,
          row.answersForMatchingRightItem,
        );
        break;
      default:
        break;
    }

    return parsedRow;
  }

  private async buildPreviewItem(
    parsedRow: ParsedQuestionExcelRowAdminDto,
  ): Promise<PreviewQuestionExcelItemAdminDto> {
    let fieldDiffs: QuestionExcelFieldDiffAdminDto[] = [];
    let childDiffs: QuestionExcelChildDiffAdminDto[] = [];
    const conflicts: string[] = [];

    conflicts.push(...(parsedRow.validationErrors || []));

    if (!Number.isFinite(parsedRow.unitId)) {
      conflicts.push('unitId는 숫자여야 합니다.');
    }

    if (!parsedRow.title) {
      conflicts.push('title은 필수입니다.');
    }

    if (!Object.values(QuestionType).includes(parsedRow.type)) {
      conflicts.push('지원하지 않는 문제 유형입니다.');
    }

    if (!parsedRow.questionId) {
      childDiffs.push(...this.buildCreateChildDiffs(parsedRow));
      return {
        sheetName: parsedRow.sheetName,
        rowNumber: parsedRow.rowNumber,
        questionId: null,
        title: parsedRow.title,
        type: parsedRow.type,
        status: conflicts.length > 0 ? 'conflict' : 'create',
        fieldDiffs,
        childDiffs,
        conflicts,
        parsedData: parsedRow,
      };
    }

    const snapshot = await this.getQuestionSnapshot(parsedRow.questionId);
    if (!snapshot) {
      conflicts.push('questionId에 해당하는 기존 문제가 없습니다.');
    } else if (snapshot.type !== parsedRow.type) {
      conflicts.push('기존 문제 유형과 업로드된 시트 유형이 다릅니다.');
    } else {
      this.pushFieldDiff(fieldDiffs, 'unitId', snapshot.unitId, parsedRow.unitId);
      this.pushFieldDiff(fieldDiffs, 'title', snapshot.title, parsedRow.title);
      this.pushFieldDiff(
        fieldDiffs,
        'explanation',
        snapshot.explanation,
        parsedRow.explanation ?? null,
      );
      this.pushFieldDiff(
        fieldDiffs,
        'additionalText',
        snapshot.additionalText,
        parsedRow.additionalText ?? null,
      );

      childDiffs.push(...this.buildChildDiffs(snapshot, parsedRow, conflicts));
    }

    fieldDiffs = fieldDiffs.filter(
      (fieldDiff) =>
        !this.isSameDiffValue(fieldDiff.currentValue, fieldDiff.uploadedValue),
    );
    childDiffs = childDiffs.filter(
      (childDiff) => childDiff.kind !== 'unchanged',
    );

    const hasChanges = fieldDiffs.length > 0 || childDiffs.length > 0;

    return {
      sheetName: parsedRow.sheetName,
      rowNumber: parsedRow.rowNumber,
      questionId: parsedRow.questionId,
      title: parsedRow.title,
      type: parsedRow.type,
      status:
        conflicts.length > 0 ? 'conflict' : hasChanges ? 'update' : 'unchanged',
      fieldDiffs,
      childDiffs,
      conflicts,
      parsedData: parsedRow,
    };
  }

  private buildChildDiffs(
    snapshot: QuestionSnapshot,
    parsedRow: ParsedQuestionExcelRowAdminDto,
    conflicts: string[],
  ): QuestionExcelChildDiffAdminDto[] {
    switch (parsedRow.type) {
      case QuestionType.TRUE_FALSE:
        return this.buildSingleValueDiff(
          snapshot.answers[0]?.isCorrect ?? false,
          parsedRow.answersForCorrectAnswerForTrueFalse ?? false,
          '정답',
        );
      case QuestionType.INTERVIEW:
        return this.buildSingleValueDiff(
          snapshot.answers[0]?.content ?? '',
          parsedRow.answersForInterview ?? '',
          '모범 답안',
        );
      case QuestionType.SHORT_ANSWER:
        return this.buildChoiceDiffs(
          snapshot.answers,
          parsedRow.answersForShortAnswers || [],
          { compareContent: true, compareIsCorrect: false, compareOrderIndex: true },
          conflicts,
        );
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        return this.buildChoiceDiffs(
          snapshot.answers,
          parsedRow.answersForMultipleShortAnswer || [],
          { compareContent: true, compareIsCorrect: false, compareOrderIndex: true },
          conflicts,
        );
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.MULTIPLE_CHOICE_INPUT:
        return this.buildChoiceDiffs(
          snapshot.answers,
          parsedRow.answersForMultipleChoice || [],
          { compareContent: true, compareIsCorrect: true, compareOrderIndex: true },
          conflicts,
        );
      case QuestionType.MATCHING:
        return this.buildMatchingDiffs(
          snapshot.answers,
          parsedRow.answersForMatching || [],
          conflicts,
        );
      default:
        return [];
    }
  }

  private buildCreateChildDiffs(
    parsedRow: ParsedQuestionExcelRowAdminDto,
  ): QuestionExcelChildDiffAdminDto[] {
    switch (parsedRow.type) {
      case QuestionType.TRUE_FALSE:
        return [
          {
            kind: 'create',
            label: '정답',
            uploadedValue: parsedRow.answersForCorrectAnswerForTrueFalse ?? false,
          },
        ];
      case QuestionType.INTERVIEW:
        return [
          {
            kind: 'create',
            label: '모범 답안',
            uploadedValue: parsedRow.answersForInterview ?? '',
          },
        ];
      case QuestionType.SHORT_ANSWER:
        return (parsedRow.answersForShortAnswers || []).map((answer, index) => ({
          kind: 'create',
          itemId: answer.id ?? null,
          label: `정답 ${index + 1}`,
          uploadedValue: answer.content,
        }));
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        return (parsedRow.answersForMultipleShortAnswer || []).map(
          (answer, index) => ({
            kind: 'create',
            itemId: answer.id ?? null,
            label: `다중 단답형 ${index + 1}`,
            uploadedValue: `${answer.orderIndex}: ${answer.content}`,
          }),
        );
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.MULTIPLE_CHOICE_INPUT:
        return (parsedRow.answersForMultipleChoice || []).map((answer, index) => ({
          kind: 'create',
          itemId: answer.id ?? null,
          label: `보기 ${index + 1}`,
          uploadedValue: `${answer.content} (${answer.isCorrect ? '정답' : '오답'})`,
        }));
      case QuestionType.MATCHING:
        return (parsedRow.answersForMatching || []).map((answer, index) => ({
          kind: 'create',
          label: `연결 ${index + 1}`,
          uploadedValue: `${answer.leftItem} -> ${answer.rightItem}`,
        }));
      default:
        return [];
    }
  }

  private buildSingleValueDiff(
    currentValue: string | boolean,
    uploadedValue: string | boolean,
    label: string,
  ): QuestionExcelChildDiffAdminDto[] {
    if (currentValue === uploadedValue) {
      return [];
    }

    const diff: QuestionExcelChildDiffAdminDto = {
      kind: 'update',
      label,
      currentValue,
      uploadedValue,
    };
    return [diff];
  }

  private buildChoiceDiffs(
    existingAnswers: Answer[],
    uploadedAnswers: ParsedQuestionExcelChoiceAdminDto[],
    options: {
      compareContent: boolean;
      compareIsCorrect: boolean;
      compareOrderIndex: boolean;
    },
    conflicts: string[],
  ): QuestionExcelChildDiffAdminDto[] {
    const diffs: QuestionExcelChildDiffAdminDto[] = [];
    const existingMap = new Map(existingAnswers.map((answer) => [answer.id, answer]));
    const uploadedIds = new Set<number>();

    uploadedAnswers.forEach((uploadedAnswer, index) => {
      if (!uploadedAnswer.id) {
        diffs.push({
          kind: 'create',
          itemId: null,
          label: `항목 ${index + 1}`,
          uploadedValue: uploadedAnswer.content,
        });
        return;
      }

      uploadedIds.add(uploadedAnswer.id);
      const existingAnswer = existingMap.get(uploadedAnswer.id);
      if (!existingAnswer) {
        conflicts.push(
          `존재하지 않는 하위 항목 ID(${uploadedAnswer.id})가 포함되어 있습니다.`,
        );
        diffs.push({
          kind: 'conflict',
          itemId: uploadedAnswer.id,
          label: `항목 ${index + 1}`,
          uploadedValue: uploadedAnswer.content,
        });
        return;
      }

      const currentValueParts: string[] = [];
      const uploadedValueParts: string[] = [];
      let kind: QuestionExcelChildDiffAdminDto['kind'] = 'unchanged';

      if (options.compareContent && existingAnswer.content !== uploadedAnswer.content) {
        kind = 'update';
      }

      if (
        options.compareIsCorrect &&
        existingAnswer.isCorrect !== Boolean(uploadedAnswer.isCorrect)
      ) {
        kind = 'update';
      }

      if (
        options.compareOrderIndex &&
        existingAnswer.orderIndex !== (uploadedAnswer.orderIndex ?? index)
      ) {
        kind = kind === 'update' ? 'update' : 'reorder';
      }

      currentValueParts.push(existingAnswer.content ?? '');
      uploadedValueParts.push(uploadedAnswer.content ?? '');

      if (options.compareIsCorrect) {
        currentValueParts.push(existingAnswer.isCorrect ? '정답' : '오답');
        uploadedValueParts.push(uploadedAnswer.isCorrect ? '정답' : '오답');
      }

      if (options.compareOrderIndex) {
        currentValueParts.push(`순서 ${existingAnswer.orderIndex}`);
        uploadedValueParts.push(`순서 ${uploadedAnswer.orderIndex ?? index}`);
      }

      diffs.push({
        kind,
        itemId: uploadedAnswer.id,
        label: `항목 ${index + 1}`,
        currentValue: currentValueParts.join(' / '),
        uploadedValue: uploadedValueParts.join(' / '),
      });
    });

    existingAnswers
      .filter((answer) => !uploadedIds.has(answer.id))
      .forEach((answer) => {
        diffs.push({
          kind: 'delete',
          itemId: answer.id,
          label: `삭제 후보 ${answer.id}`,
          currentValue: answer.content,
        });
      });

    return diffs;
  }

  private buildMatchingDiffs(
    existingAnswers: Answer[],
    uploadedAnswers: ParsedQuestionExcelMatchingAdminDto[],
    conflicts: string[],
  ): QuestionExcelChildDiffAdminDto[] {
    const diffs: QuestionExcelChildDiffAdminDto[] = [];
    const leftItems = existingAnswers
      .filter((answer) => !answer.pairingAnswerId)
      .sort((left, right) => left.orderIndex - right.orderIndex);
    const rightByLeftId = new Map(
      existingAnswers
        .filter((answer) => answer.pairingAnswerId)
        .map((answer) => [answer.pairingAnswerId, answer]),
    );
    const uploadedIds = new Set<number>();

    uploadedAnswers.forEach((uploadedAnswer, index) => {
      if (!uploadedAnswer.leftItemId || !uploadedAnswer.pairingItemId) {
        diffs.push({
          kind: 'create',
          label: `연결 ${index + 1}`,
          uploadedValue: `${uploadedAnswer.leftItem} -> ${uploadedAnswer.rightItem}`,
        });
        return;
      }

      uploadedIds.add(uploadedAnswer.leftItemId);
      uploadedIds.add(uploadedAnswer.pairingItemId);

      const leftItem = leftItems.find(
        (answer) => answer.id === uploadedAnswer.leftItemId,
      );
      const rightItem = rightByLeftId.get(uploadedAnswer.leftItemId);

      if (!leftItem || !rightItem || rightItem.id !== uploadedAnswer.pairingItemId) {
        conflicts.push(
          `연결형 항목 ID(${uploadedAnswer.leftItemId}, ${uploadedAnswer.pairingItemId}) 조합이 올바르지 않습니다.`,
        );
        diffs.push({
          kind: 'conflict',
          label: `연결 ${index + 1}`,
          uploadedValue: `${uploadedAnswer.leftItem} -> ${uploadedAnswer.rightItem}`,
        });
        return;
      }

      let kind: QuestionExcelChildDiffAdminDto['kind'] = 'unchanged';
      if (
        leftItem.content !== uploadedAnswer.leftItem ||
        rightItem.content !== uploadedAnswer.rightItem
      ) {
        kind = 'update';
      }
      if (leftItem.orderIndex !== uploadedAnswer.orderIndex) {
        kind = kind === 'update' ? 'update' : 'reorder';
      }

      diffs.push({
        kind,
        itemId: uploadedAnswer.leftItemId,
        label: `연결 ${index + 1}`,
        currentValue: `${leftItem.content} -> ${rightItem.content} / 순서 ${leftItem.orderIndex}`,
        uploadedValue: `${uploadedAnswer.leftItem} -> ${uploadedAnswer.rightItem} / 순서 ${uploadedAnswer.orderIndex}`,
      });
    });

    existingAnswers
      .filter((answer) => !uploadedIds.has(answer.id))
      .forEach((answer) => {
        diffs.push({
          kind: 'delete',
          itemId: answer.id,
          label: `삭제 후보 ${answer.id}`,
          currentValue: answer.content,
        });
      });

    return diffs;
  }

  private async createQuestion(
    manager: EntityManager,
    parsedRow: ParsedQuestionExcelRowAdminDto,
  ) {
    const questionRepository = manager.getRepository(Question);
    const answerRepository = manager.getRepository(Answer);

    const question = await questionRepository.save(
      questionRepository.create({
        unitId: parsedRow.unitId,
        type: parsedRow.type,
        title: parsedRow.title,
        explanation: parsedRow.explanation ?? null,
        additionalText: parsedRow.additionalText ?? null,
      }),
    );

    await this.syncAnswers(answerRepository, question.id, parsedRow, []);
  }

  private async updateQuestion(
    manager: EntityManager,
    parsedRow: ParsedQuestionExcelRowAdminDto,
  ) {
    const questionRepository = manager.getRepository(Question);
    const answerRepository = manager.getRepository(Answer);

    const question = await questionRepository.findOne({
      where: { id: parsedRow.questionId },
    });

    if (!question) {
      throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
    }

    await questionRepository.update(
      { id: parsedRow.questionId },
      {
        unitId: parsedRow.unitId,
        title: parsedRow.title,
        explanation: parsedRow.explanation ?? null,
        additionalText: parsedRow.additionalText ?? null,
      },
    );

    const existingAnswers = await answerRepository.find({
      where: { questionId: parsedRow.questionId },
    });

    await this.syncAnswers(
      answerRepository,
      parsedRow.questionId,
      parsedRow,
      existingAnswers,
    );
  }

  private async syncAnswers(
    answerRepository: any,
    questionId: number,
    parsedRow: ParsedQuestionExcelRowAdminDto,
    existingAnswers: Answer[],
  ) {
    const repository = answerRepository;
    const existingMap = new Map(
      existingAnswers.map((answer) => [answer.id, answer]),
    );
    const keepIds = new Set<number>();

    if (parsedRow.type === QuestionType.TRUE_FALSE) {
      const existingAnswer = existingAnswers[0];
      if (existingAnswer) {
        await repository.update(
          { id: existingAnswer.id },
          { isCorrect: parsedRow.answersForCorrectAnswerForTrueFalse ?? false },
        );
      } else {
        await repository.save(
          repository.create({
            questionId,
            isCorrect: parsedRow.answersForCorrectAnswerForTrueFalse ?? false,
          }),
        );
      }
      return;
    }

    if (parsedRow.type === QuestionType.INTERVIEW) {
      const existingAnswer = existingAnswers[0];
      if (existingAnswer) {
        await repository.update(
          { id: existingAnswer.id },
          { content: parsedRow.answersForInterview ?? '' },
        );
      } else {
        await repository.save(
          repository.create({
            questionId,
            content: parsedRow.answersForInterview ?? '',
          }),
        );
      }
      return;
    }

    if (parsedRow.type === QuestionType.MATCHING) {
      for (const pair of parsedRow.answersForMatching || []) {
        let leftId = pair.leftItemId ?? null;
        let rightId = pair.pairingItemId ?? null;

        if (leftId && existingMap.has(leftId)) {
          keepIds.add(leftId);
          await repository.update(
            { id: leftId },
            { content: pair.leftItem, orderIndex: pair.orderIndex },
          );
        } else {
          const createdLeft = await repository.save(
            repository.create({
              questionId,
              content: pair.leftItem,
              orderIndex: pair.orderIndex,
            }),
          );
          leftId = createdLeft.id;
        }

        if (rightId && existingMap.has(rightId)) {
          keepIds.add(rightId);
          await repository.update(
            { id: rightId },
            {
              content: pair.rightItem,
              orderIndex: pair.orderIndex,
              pairingAnswerId: leftId,
            },
          );
        } else {
          const createdRight = await repository.save(
            repository.create({
              questionId,
              content: pair.rightItem,
              orderIndex: pair.orderIndex,
              pairingAnswerId: leftId,
            }),
          );
          rightId = createdRight.id;
        }
      }

      const deleteIds = existingAnswers
        .filter((answer) => !keepIds.has(answer.id))
        .map((answer) => answer.id);

      if (deleteIds.length > 0) {
        await repository.softDelete(deleteIds);
      }

      return;
    }

    const parsedAnswers =
      parsedRow.type === QuestionType.SHORT_ANSWER
        ? parsedRow.answersForShortAnswers || []
        : parsedRow.type === QuestionType.MULTIPLE_SHORT_ANSWER
          ? parsedRow.answersForMultipleShortAnswer || []
          : parsedRow.answersForMultipleChoice || [];

    for (const [index, parsedAnswer] of parsedAnswers.entries()) {
      const orderIndex = parsedAnswer.orderIndex ?? index;
      if (parsedAnswer.id && existingMap.has(parsedAnswer.id)) {
        keepIds.add(parsedAnswer.id);
        await repository.update(
          { id: parsedAnswer.id },
          {
            content: parsedAnswer.content,
            isCorrect:
              parsedRow.type === QuestionType.SHORT_ANSWER ||
              parsedRow.type === QuestionType.MULTIPLE_SHORT_ANSWER
                ? true
                : Boolean(parsedAnswer.isCorrect),
            orderIndex,
          },
        );
      } else {
        await repository.save(
          repository.create({
            questionId,
            content: parsedAnswer.content,
            isCorrect:
              parsedRow.type === QuestionType.SHORT_ANSWER ||
              parsedRow.type === QuestionType.MULTIPLE_SHORT_ANSWER
                ? true
                : Boolean(parsedAnswer.isCorrect),
            orderIndex,
          }),
        );
      }
    }

    const deleteIds = existingAnswers
      .filter((answer) => !keepIds.has(answer.id))
      .map((answer) => answer.id);

    if (deleteIds.length > 0) {
      await repository.softDelete(deleteIds);
    }
  }

  private async getQuestionSnapshot(questionId: number) {
    const question = await this.questionRepository.findById(questionId);
    if (!question) {
      return null;
    }

    const answers = (await this.answerRepository.findByQuestionId(questionId)).sort(
      (left, right) => left.orderIndex - right.orderIndex || left.id - right.id,
    );

    return {
      id: question.id,
      unitId: question.unitId,
      title: question.title,
      explanation: question.explanation,
      additionalText: question.additionalText,
      type: question.type,
      answers,
    } satisfies QuestionSnapshot;
  }

  private buildExportRow(
    snapshot: QuestionSnapshot,
    sheetName: string,
  ): Record<string, string | number | null> {
    const baseRow: Record<string, string | number | null> = {
      questionId: snapshot.id,
      unitId: snapshot.unitId,
      type: snapshot.type,
      title: snapshot.title,
      explanation: snapshot.explanation ?? '',
      additionalText: snapshot.additionalText ?? '',
    };

    switch (sheetName) {
      case 'TRUE_FALSE':
        return {
          ...baseRow,
          answersForCorrectAnswerForTrueFalse: snapshot.answers[0]?.isCorrect
            ? 'TRUE'
            : 'FALSE',
        };
      case 'INTERVIEW':
        return {
          ...baseRow,
          answersForInterview: snapshot.answers[0]?.content ?? '',
        };
      case 'SHORT_ANSWER':
        return {
          ...baseRow,
          answersForShortAnswerIds: this.joinLines(
            snapshot.answers.map((answer) => answer.id),
          ),
          answersForShortAnswer: this.joinLines(
            snapshot.answers.map((answer) => answer.content),
          ),
        };
      case 'MULTIPLE_SHORT_ANSWER':
        return {
          ...baseRow,
          answersForMultipleShortAnswerIds: this.joinLines(
            snapshot.answers.map((answer) => answer.id),
          ),
          answersForMultipleShortAnswerContent: this.joinLines(
            snapshot.answers.map((answer) => answer.content),
          ),
          answersForMultipleShortAnswerOrderIndex: this.joinLines(
            snapshot.answers.map((answer) => answer.orderIndex),
          ),
        };
      case 'MULTIPLE_CHOICE':
      case 'MULTIPLE_CHOICE_ANSWER':
        return {
          ...baseRow,
          type:
            sheetName === 'MULTIPLE_CHOICE_ANSWER'
              ? QuestionType.MULTIPLE_CHOICE_INPUT
              : snapshot.type,
          answersForMultipleChoiceIds: this.joinLines(
            snapshot.answers.map((answer) => answer.id),
          ),
          answersForMultipleChoice: this.joinLines(
            snapshot.answers.map((answer) => answer.content),
          ),
          answersForMultipleChoiceIsCorrect: this.joinLines(
            snapshot.answers.map((answer) =>
              answer.isCorrect ? 'TRUE' : 'FALSE',
            ),
          ),
        };
      case 'MATCHING': {
        const leftItems = snapshot.answers
          .filter((answer) => !answer.pairingAnswerId)
          .sort((left, right) => left.orderIndex - right.orderIndex);
        const rightByLeftId = new Map(
          snapshot.answers
            .filter((answer) => answer.pairingAnswerId)
            .map((answer) => [answer.pairingAnswerId, answer]),
        );
        return {
          ...baseRow,
          answersForMatchingLeftItemIds: this.joinLines(
            leftItems.map((item) => item.id),
          ),
          answersForMatchingRightItemIds: this.joinLines(
            leftItems
              .map((item) => rightByLeftId.get(item.id)?.id)
              .filter((item): item is number => Boolean(item)),
          ),
          answersForMatchingLeftItem: this.joinLines(
            leftItems.map((item) => item.content),
          ),
          answersForMatchingRightItem: this.joinLines(
            leftItems.map((item) => rightByLeftId.get(item.id)?.content ?? ''),
          ),
        };
      }
      default:
        return baseRow;
    }
  }

  private parseMultipleChoices(
    idsValue: string,
    contentValue: string,
    correctValue: string,
    validationErrors?: string[],
  ) {
    const ids = this.parseIdLines(idsValue);
    const contents = this.splitLines(contentValue);
    const corrects = this.splitLines(correctValue).map((value, index) =>
      this.parseBoolean(
        value,
        `answersForMultipleChoiceIsCorrect[${index}]`,
        validationErrors,
      ),
    );

    return contents.map((content, index) => ({
      id: ids[index] ?? null,
      content,
      isCorrect: corrects[index] ?? false,
      orderIndex: index,
    }));
  }

  private parseOrderedLineItems(
    idsValue: string,
    contentValue: string,
    orderValue: string,
    validationErrors?: string[],
  ) {
    const ids = this.parseIdLines(idsValue);
    const contents = this.splitLines(contentValue);
    const orders = this.splitLines(orderValue).map((value, index) => {
      return this.parseRequiredNumber(
        value,
        `answersForMultipleShortAnswerOrderIndex[${index}]`,
        validationErrors ?? [],
        index,
      );
    });

    return contents.map((content, index) => ({
      id: ids[index] ?? null,
      content,
      orderIndex: orders[index] ?? index,
    }));
  }

  private parseLineItems(idsValue: string, contentValue: string) {
    const ids = this.parseIdLines(idsValue);
    const contents = this.splitLines(contentValue);

    return contents.map((content, index) => ({
      id: ids[index] ?? null,
      content,
      orderIndex: index,
    }));
  }

  private parseMatchingItems(
    leftIdsValue: string,
    rightIdsValue: string,
    leftItemsValue: string,
    rightItemsValue: string,
  ) {
    const leftIds = this.parseIdLines(leftIdsValue);
    const rightIds = this.parseIdLines(rightIdsValue);
    const leftItems = this.splitLines(leftItemsValue);
    const rightItems = this.splitLines(rightItemsValue);

    return leftItems.map((leftItem, index) => ({
      leftItemId: leftIds[index] ?? null,
      pairingItemId: rightIds[index] ?? null,
      leftItem,
      rightItem: rightItems[index] ?? '',
      orderIndex: index,
    }));
  }

  private parseQuestionType(value: string) {
    return (value || '').trim() as QuestionType;
  }

  private parseRequiredNumber(
    value: string,
    fieldName: string,
    validationErrors: string[],
    fallback = Number.NaN,
  ) {
    const parsed = this.parseNullableNumber(value);
    if (parsed === null) {
      validationErrors.push(`${fieldName}는 숫자여야 합니다.`);
      return fallback;
    }

    return parsed;
  }

  private parseNullableNumber(value: string) {
    const trimmed = (value || '').trim();
    if (!trimmed) {
      return null;
    }

    const normalized = trimmed.replaceAll(',', '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private parseNullableString(value: string) {
    const trimmed = (value || '').trim();
    return trimmed ? trimmed : null;
  }

  private parseIdLines(value: string) {
    return this.splitLines(value).map((item) => this.parseNullableNumber(item));
  }

  private parseBoolean(
    value: string,
    fieldName?: string,
    validationErrors?: string[],
  ) {
    const normalized = (value || '').trim().toLowerCase();
    if (!normalized) {
      return undefined;
    }

    if (['true', '1', 'y', 'yes'].includes(normalized)) {
      return true;
    }

    if (['false', '0', 'n', 'no'].includes(normalized)) {
      return false;
    }

    if (fieldName && validationErrors) {
      validationErrors.push(
        `${fieldName}는 TRUE/FALSE 또는 1/0 형식이어야 합니다.`,
      );
    }

    return undefined;
  }

  private splitLines(value: string) {
    return (value || '')
      .replaceAll('\r', '')
      .split('\n')
      .map((item) => item.trim())
      .filter((item) => item !== '');
  }

  private joinLines(values: Array<string | number | null | undefined>) {
    return values
      .map((value) => (value === null || value === undefined ? '' : String(value)))
      .join('\n');
  }

  private isEmptyRow(row: Record<string, string>) {
    return Object.values(row).every((value) => `${value || ''}`.trim() === '');
  }

  private pushFieldDiff(
    fieldDiffs: QuestionExcelFieldDiffAdminDto[],
    field: string,
    currentValue: string | number | boolean | null,
    uploadedValue: string | number | boolean | null,
  ) {
    if ((currentValue ?? null) !== (uploadedValue ?? null)) {
      fieldDiffs.push({
        field,
        currentValue,
        uploadedValue,
      });
    }
  }

  private isSameDiffValue(
    currentValue: string | number | boolean | null | undefined,
    uploadedValue: string | number | boolean | null | undefined,
  ) {
    return (currentValue ?? null) === (uploadedValue ?? null);
  }

  private mapSheetNameByQuestionType(type: QuestionType) {
    if (type === QuestionType.MULTIPLE_CHOICE_INPUT) {
      return 'MULTIPLE_CHOICE_ANSWER';
    }
    return type;
  }

  private mapQuestionTypeBySheetName(sheetName: string) {
    if (sheetName === 'MULTIPLE_CHOICE_ANSWER') {
      return QuestionType.MULTIPLE_CHOICE_INPUT;
    }
    return sheetName as QuestionType;
  }
}
