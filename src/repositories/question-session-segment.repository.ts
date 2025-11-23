import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AdminUser } from 'src/entities/admin-user.entity';
import { QuestionSessionSegment } from 'src/entities/question-session-segment.entity';
import { QuestionSession } from 'src/entities/question-session.entity';
import { Unit } from 'src/entities/unit.entity';
import { EntityManager, In, IsNull, LessThan, Repository } from 'typeorm';

@Injectable()
export class QuestionSessionSegmentRepository {
  constructor(
    @InjectRepository(QuestionSessionSegment)
    private readonly questionSessionSegmentRepository: Repository<QuestionSessionSegment>,
  ) {}

  async start(sessionId: number) {
    const newSegment = this.questionSessionSegmentRepository.create({
      sessionId,
      startedAt: new Date(),
    });
    return this.questionSessionSegmentRepository.save(newSegment);
  }

  async stop(sessionId: number) {
    const openSegment = await this.findOpenSegmentBySessionId(sessionId);
    if (!openSegment) return null;

    await this.questionSessionSegmentRepository.update(
      { id: openSegment.id },
      { endedAt: new Date() },
    );

    return this.findOneById(openSegment.id);
  }

  async findOpenSegmentBySessionId(sessionId: number) {
    return this.questionSessionSegmentRepository.findOne({
      where: { sessionId, openFlag: 1 },
    });
  }

  async findOneById(id: number) {
    return this.questionSessionSegmentRepository.findOne({
      where: { id },
    });
  }

  async updateLastPingAt(segmentId: number, lastPingAt: Date) {
    await this.questionSessionSegmentRepository.update(
      { id: segmentId },
      { lastPingAt },
    );
  }

  async getElapsedMs(sessionId: number): Promise<number> {
    const [{ durationMs = 0 } = {} as any] =
      await this.questionSessionSegmentRepository.query(
        `
        SELECT
          FLOOR(COALESCE(SUM(
            TIMESTAMPDIFF(MICROSECOND, startedAt, COALESCE(endedAt, n.now3))
          ), 0) / 1000) AS durationMs
        FROM question_session_segment
        CROSS JOIN (SELECT NOW(3) AS now3) AS n
        WHERE sessionId = ?
        `,
        [sessionId],
      );

    return Number(durationMs);
  }

  async getElapsedMsByIds(sessionIds: number[]) {
    if (sessionIds.length === 0) {
      return [];
    }

    const rows = await this.questionSessionSegmentRepository.query<
      {
        sessionId: number;
        durationMs: number;
      }[]
    >(
      `
      SELECT
        sessionId,
        FLOOR(COALESCE(SUM(
          TIMESTAMPDIFF(MICROSECOND, startedAt, COALESCE(endedAt, n.now3))
        ), 0) / 1000) AS durationMs
      FROM question_session_segment
      CROSS JOIN (SELECT NOW(3) AS now3) AS n
      WHERE sessionId IN (?)
      GROUP BY sessionId
      `,
      [sessionIds],
    );

    return rows;
  }

  // 유저별 최근 학습 시간 7일, 30일, 당일
  async getElapsedMsByUserIds(userIds: number[]) {
    if (userIds.length === 0) {
      return [];
    }

    const rows = await this.questionSessionSegmentRepository.query<
      {
        userId: number;
        durationMs7Days: number;
        durationMs30Days: number;
        durationMsToday: number;
        durationMsTotal: number;
      }[]
    >(
      `
      SELECT
        qs.userId AS userId,
        FLOOR(COALESCE(SUM(
          CASE
            -- 7일 (7 days ago to now)
            WHEN qss.startedAt >= DATE_SUB(n.now, INTERVAL 7 DAY) THEN TIMESTAMPDIFF(MICROSECOND, qss.startedAt, COALESCE(qss.endedAt, n.now))
            ELSE 0
          END
        ), 0) / 1000) AS durationMs7Days,

        FLOOR(COALESCE(SUM(
          CASE
            -- 30일 (30 days ago to now)
            WHEN qss.startedAt >= DATE_SUB(n.now, INTERVAL 30 DAY) THEN TIMESTAMPDIFF(MICROSECOND, qss.startedAt, COALESCE(qss.endedAt, n.now))
            ELSE 0
          END
        ), 0) / 1000) AS durationMs30Days,

        FLOOR(COALESCE(SUM(
          CASE
            -- 당일 (midnight today to now)
            WHEN qss.startedAt >= DATE(n.now) THEN TIMESTAMPDIFF(MICROSECOND, qss.startedAt, COALESCE(qss.endedAt, n.now))
            ELSE 0
          END
        ), 0) / 1000) AS durationMsToday,

        FLOOR(COALESCE(SUM(
          TIMESTAMPDIFF(MICROSECOND, qss.startedAt, COALESCE(qss.endedAt, n.now))
        ), 0) / 1000) AS durationMsTotal
      FROM question_session_segment AS qss
      INNER JOIN question_session AS qs ON qs.id = qss.sessionId
      -- Use NOW() for the current timestamp once
      CROSS JOIN (SELECT NOW() AS now) AS n
      WHERE qs.userId IN (?)
        -- Optimize: Only query data relevant to the largest window (30 days)
        AND qss.startedAt >= DATE_SUB(n.now, INTERVAL 30 DAY)
      GROUP BY qs.userId
    `,
      [userIds],
    );

    return rows;
  }

  async getStoppedPingSegments() {
    const tenSecondsAgo = new Date(Date.now() - 10 * 1000);

    return this.questionSessionSegmentRepository.find({
      where: {
        openFlag: 1,
        lastPingAt: LessThan(tenSecondsAgo),
      },
    });
  }
}
