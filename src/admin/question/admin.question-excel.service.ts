import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectEntityManager } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { EntityManager, In } from 'typeorm';
import { Question } from 'src/entities/question.entity';
import { Answer } from 'src/entities/answer.entity';
import { Unit } from 'src/entities/unit.entity';
import { QuestionExcelBatch } from 'src/entities/question-excel-batch.entity';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { CommitQuestionExcelAdminDto } from 'src/dtos/admin/question/question-excel.admin.dto';
import {
  contentHash,
  digest,
  ExcelQuestion,
  ExcelRow,
  EXCEL_MAX_BYTES,
  excelFields,
  exportExcel,
  parseExcel,
  snapshot,
} from './question-excel.codec';

@Injectable()
export class AdminQuestionExcelService {
  constructor(@InjectEntityManager() private readonly manager: EntityManager) {}

  private groupAnswers(answers: Answer[]) {
    const grouped = new Map<string, Answer[]>();
    for (const answer of answers) {
      const key = String(answer.questionId);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(answer);
    }
    return grouped;
  }

  async download(rawUnitIds: string) {
    const ids = [
      ...new Set((rawUnitIds || '').split(',').map((value) => value.trim())),
    ];
    if (
      !ids.length ||
      ids.some(
        (id) =>
          !/^\d+$/.test(id) ||
          !Number.isSafeInteger(Number(id)) ||
          Number(id) <= 0,
      )
    ) {
      throw new BadRequestException(
        '다운로드할 능력단위을 하나 이상 선택하세요.',
      );
    }
    return this.manager.transaction('REPEATABLE READ', async (manager) => {
      const units = await manager.find(Unit, { where: { id: In(ids) } });
      if (units.length !== ids.length)
        throw new BadRequestException('선택된 능력단위을 찾을 수 없습니다.');
      const questions = await manager.find(Question, {
        where: { unitId: In(ids) },
        order: { unitId: 'ASC', id: 'ASC' },
      });
      const answers = questions.length
        ? await manager.find(Answer, {
            where: { questionId: In(questions.map((q) => q.id)) },
          })
        : [];
      try {
        return exportExcel(questions, answers);
      } catch (error) {
        throw new BadRequestException(error.message);
      }
    });
  }

  private summary(rows: ExcelRow[]) {
    const counts = { new: 0, updated: 0, unchanged: 0, error: 0, warning: 0 };
    const units = new Map<
      string,
      {
        unitId: number | null;
        unitName: string;
        total: number;
        new: number;
        updated: number;
        unchanged: number;
        error: number;
        warning: number;
      }
    >();
    for (const row of rows) {
      counts[row.status]++;
      if (row.warnings.length) counts.warning++;
      const key = String(row.unitId);
      if (!units.has(key))
        units.set(key, {
          unitId: row.unitId,
          unitName: row.unitName || '능력단위 확인 필요',
          total: 0,
          new: 0,
          updated: 0,
          unchanged: 0,
          error: 0,
          warning: 0,
        });
      const unit = units.get(key);
      unit.total++;
      unit[row.status]++;
      if (row.warnings.length) unit.warning++;
    }
    return { counts, units: [...units.values()] };
  }

  async preview(adminId: number, file: Express.Multer.File) {
    if (
      !file ||
      !/\.xlsx$/i.test(file.originalname) ||
      file.buffer.length > EXCEL_MAX_BYTES ||
      file.buffer.subarray(0, 2).toString() !== 'PK'
    ) {
      throw new BadRequestException(
        '10MB 이하의 .xlsx 파일 하나를 선택하세요.',
      );
    }
    let rows: ExcelRow[];
    try {
      rows = parseExcel(file.buffer);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
    // Invalid text must never be sent to a numeric SQL IN clause.
    const ids = rows
      .filter(
        (row) =>
          row.questionId &&
          /^\d+$/.test(row.questionId) &&
          Number.isSafeInteger(Number(row.questionId)),
      )
      .map((row) => row.questionId);
    const unitIds = [
      ...new Set(
        rows.filter((row) => row.unitId !== null).map((row) => row.unitId),
      ),
    ];
    const [units, questions]: [Unit[], Question[]] = await Promise.all([
      unitIds.length
        ? this.manager.find(Unit, { where: { id: In(unitIds) } })
        : [],
      ids.length || unitIds.length
        ? this.manager.find(Question, {
            where: [
              ...(ids.length ? [{ id: In(ids) }] : []),
              ...(unitIds.length ? [{ unitId: In(unitIds) }] : []),
            ],
          })
        : [],
    ]);
    const answers = questions.length
      ? await this.manager.find(Answer, {
          where: { questionId: In(questions.map((q) => q.id)) },
        })
      : [];
    const grouped = this.groupAnswers(answers);
    const questionsById = new Map(questions.map((q) => [String(q.id), q]));
    const unitsById = new Map(
      units.map((unit) => [Number(unit.id), unit.name]),
    );
    const duplicateIds = new Map<string, number>();
    const newHashes = new Map<string, number>();
    const existingHashes = new Set<string>();
    for (const question of questions) {
      try {
        existingHashes.add(
          contentHash(
            snapshot(question, grouped.get(String(question.id)) || []).value,
          ),
        );
      } catch {
        /* An unrelated unsupported or malformed question does not prevent imports. */
      }
    }
    for (const row of rows) {
      if (row.questionId)
        duplicateIds.set(
          row.questionId,
          (duplicateIds.get(row.questionId) || 0) + 1,
        );
      else if (row.value) {
        const hash = contentHash(row.value);
        newHashes.set(hash, (newHashes.get(hash) || 0) + 1);
      }
    }
    for (const row of rows) {
      if (row.unitId !== null) {
        row.unitName = unitsById.get(row.unitId);
        if (!row.unitName) row.errors.push('존재하지 않는 능력단위입니다.');
      }
      if (row.questionId && duplicateIds.get(row.questionId) > 1)
        row.errors.push('파일 안에 같은 questionId가 여러 번 있습니다.');
      if (row.questionId && row.value) {
        const question = questionsById.get(row.questionId);
        if (!question)
          row.errors.push('기존 문제를 찾을 수 없습니다. ID를 확인하세요.');
        else
          try {
            const original = snapshot(
              question,
              grouped.get(row.questionId) || [],
            );
            if (!row.originalHash || row.originalHash !== original.hash)
              row.errors.push(
                '원본 검증 정보가 없거나 문제가 변경됐습니다. 다시 다운로드하세요.',
              );
            if (row.value.unitId !== Number(question.unitId))
              row.errors.push('기존 문제의 능력단위를 변경할 수 없습니다.');
            if (row.value.type !== question.type)
              row.errors.push('기존 문제의 유형을 변경할 수 없습니다.');
            if (row.value.answers.length !== original.value.answers.length)
              row.errors.push('기존 답안 항목 개수를 유지하세요.');
            if (
              question.type === QuestionType.MULTIPLE_SHORT_ANSWER &&
              digest(row.value.answers.map((a) => a.orderIndex)) !==
                digest(original.value.answers.map((a) => a.orderIndex))
            )
              row.errors.push('기존 빈칸 번호별 답안 구조를 유지하세요.');
            const before = excelFields(original.value);
            const after = excelFields(row.value);
            row.changes = Object.keys(after)
              .filter(
                (key) => String(before[key] ?? '') !== String(after[key] ?? ''),
              )
              .map((field) => ({
                field,
                before: String(before[field] ?? ''),
                after: String(after[field] ?? ''),
              }));
            row.status = row.changes.length ? 'updated' : 'unchanged';
          } catch (error) {
            row.errors.push(error.message);
          }
      } else if (row.value) {
        row.changes = Object.entries(excelFields(row.value)).map(
          ([field, after]) => ({ field, before: '', after: String(after) }),
        );
        if (row.originalHash)
          row.errors.push(
            '기존 문제의 questionId가 지워졌습니다. 신규 문제라면 숨김 검증 값도 비우세요.',
          );
        const hash = contentHash(row.value);
        if (existingHashes.has(hash))
          row.warnings.push(
            '동일 능력단위·유형·내용의 문제가 이미 있습니다. 반영하면 별도 문제로 등록됩니다.',
          );
        if (newHashes.get(hash) > 1)
          row.warnings.push(
            '파일 안에 동일한 신규 문제가 여러 번 있습니다. 각 행이 별도로 등록됩니다.',
          );
      }
      if (row.errors.length) row.status = 'error';
    }
    const batch = this.manager.create(QuestionExcelBatch, {
      id: randomUUID(),
      adminId: String(adminId),
      rows,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      result: null,
      committedAt: null,
    });
    await this.manager.save(batch);
    return {
      previewId: batch.id,
      expiresAt: batch.expiresAt,
      ...this.summary(rows),
      rows: rows.map(({ originalHash, value, ...row }) => row),
    };
  }

  async commit(adminId: number, dto: CommitQuestionExcelAdminDto) {
    return this.manager.transaction(async (manager) => {
      const batch = await manager.findOne(QuestionExcelBatch, {
        where: { id: dto.previewId, adminId: String(adminId) },
        lock: { mode: 'pessimistic_write' },
      });
      if (!batch) throw new NotFoundException('검토 결과를 찾을 수 없습니다.');
      if (batch.result) return batch.result;
      if (new Date(batch.expiresAt).getTime() <= Date.now())
        throw new ConflictException(
          '검토 결과가 만료됐습니다. 파일을 다시 검사하세요.',
        );
      if (batch.rows.some((row) => row.errors.length))
        throw new BadRequestException('오류를 수정한 파일로 다시 검사하세요.');
      if (
        batch.rows.some((row) => row.warnings.length) &&
        dto.acknowledgeWarnings !== true
      )
        throw new BadRequestException('중복 등록 경고를 확인하세요.');
      const unitIds = [
        ...new Set(batch.rows.map((row) => row.value.unitId)),
      ].sort((a, b) => a - b);
      const units = await manager.find(Unit, {
        where: { id: In(unitIds) },
        order: { id: 'ASC' },
        lock: { mode: 'pessimistic_write' },
      });
      if (units.length !== unitIds.length)
        throw new ConflictException(
          '능력단위가 변경됐습니다. 파일을 다시 검사하세요.',
        );
      const ids = batch.rows
        .filter((row) => row.questionId)
        .map((row) => row.questionId);
      const questions = ids.length
        ? await manager.find(Question, {
            where: { id: In(ids) },
            order: { id: 'ASC' },
            lock: { mode: 'pessimistic_write' },
          })
        : [];
      const answers = ids.length
        ? await manager.find(Answer, {
            where: { questionId: In(ids) },
            order: { id: 'ASC' },
            lock: { mode: 'pessimistic_write' },
          })
        : [];
      const grouped = this.groupAnswers(answers);
      const originals = new Map<string, ReturnType<typeof snapshot>>();
      for (const question of questions)
        originals.set(
          String(question.id),
          snapshot(question, grouped.get(String(question.id)) || []),
        );
      for (const row of batch.rows.filter((row) => row.questionId)) {
        if (originals.get(row.questionId)?.hash !== row.originalHash)
          throw new ConflictException(
            `${row.sheet} ${row.row}행: 검토 후 문제가 변경됐습니다. 다시 검사하세요.`,
          );
      }
      // New duplicates appearing after preview require another review, even if an unrelated warning was acknowledged.
      const newRows = batch.rows.filter(
        (row) =>
          row.status === 'new' &&
          !row.warnings.some(
            (w) => w.startsWith('동일 능력단위') || w.startsWith('동일 Unit'),
          ),
      );
      if (newRows.length) {
        const current = await manager.find(Question, {
          where: { unitId: In(unitIds) },
        });
        const currentAnswers = current.length
          ? await manager.find(Answer, {
              where: { questionId: In(current.map((q) => q.id)) },
            })
          : [];
        const currentGrouped = this.groupAnswers(currentAnswers);
        const hashes = new Set<string>();
        for (const question of current) {
          try {
            hashes.add(
              contentHash(
                snapshot(
                  question,
                  currentGrouped.get(String(question.id)) || [],
                ).value,
              ),
            );
          } catch {
            /* unrelated invalid data */
          }
        }
        if (newRows.some((row) => hashes.has(contentHash(row.value))))
          throw new ConflictException(
            '검토 이후 동일한 문제가 등록됐습니다. 파일을 다시 검사하세요.',
          );
      }
      const result = {
        created: 0,
        updated: 0,
        unchanged: 0,
        questionIds: [] as string[],
      };
      for (const row of batch.rows) {
        if (row.status === 'unchanged') {
          result.unchanged++;
          continue;
        }
        const { answers: input, ...fields } = row.value;
        if (row.status === 'new') {
          const question = await manager.save(manager.create(Question, fields));
          for (const item of input) {
            const { rightContent, ...answerFields } = item;
            const left = await manager.save(
              manager.create(Answer, {
                ...answerFields,
                questionId: question.id,
              }),
            );
            if (row.value.type === QuestionType.MATCHING)
              await manager.save(
                manager.create(Answer, {
                  questionId: question.id,
                  content: rightContent,
                  pairingAnswerId: left.id,
                  isCorrect: false,
                  orderIndex: 0,
                }),
              );
          }
          result.created++;
          result.questionIds.push(String(question.id));
        } else {
          await manager.update(Question, row.questionId, {
            title: fields.title,
            explanation: fields.explanation,
            additionalText: fields.additionalText,
          });
          const original = originals.get(row.questionId);
          for (let i = 0; i < input.length; i++) {
            const item = input[i];
            const answer = original.slots[i];
            const changes: Partial<Answer> = { content: item.content };
            if (
              [
                QuestionType.TRUE_FALSE,
                QuestionType.MULTIPLE_CHOICE,
                QuestionType.MULTIPLE_CHOICE_INPUT,
              ].includes(row.value.type)
            )
              changes.isCorrect = item.isCorrect;
            await manager.update(Answer, answer.id, changes);
            if (row.value.type === QuestionType.MATCHING) {
              const right = original.answers.find(
                (a) => String(a.pairingAnswerId) === String(answer.id),
              );
              await manager.update(Answer, right.id, {
                content: item.rightContent,
              });
            }
          }
          result.updated++;
        }
      }
      await manager.update(QuestionExcelBatch, batch.id, {
        result,
        committedAt: new Date(),
      });
      return result;
    });
  }
}
