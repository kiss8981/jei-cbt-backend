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
