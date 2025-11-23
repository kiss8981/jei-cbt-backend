import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { GetQuestionSessionListQueryAdminDto } from 'src/dtos/admin/question/get-question-session-list-query.admin.dto';
import { GetQuestionSessionListAdminDto } from 'src/dtos/admin/question/get-question-session-list.admin.dto';
import { createPaginationDto } from 'src/dtos/common/pagination.dto';
import { QuestionSessionSegmentRepository } from 'src/repositories/question-session-segment.repository';
import { QuestionSessionRepository } from 'src/repositories/question-session.repository';
import { UserRepository } from 'src/repositories/user.repository';

@Injectable()
export class AdminQuestionSessionService {
  constructor(
    private readonly questionSessionRepository: QuestionSessionRepository,
    private readonly userRepository: UserRepository,
    private readonly questionSessionSegmentRepository: QuestionSessionSegmentRepository,
  ) {}

  async getAll(
    page: number,
    limit: number,
    query: GetQuestionSessionListQueryAdminDto,
  ) {
    const { keyword, userIds } = query;

    const [sessions, total] = await this.questionSessionRepository.findAndCount(
      page,
      limit,
      {
        keyword,
        userIds,
      },
    );

    if (sessions.length === 0) {
      return plainToInstance(
        createPaginationDto(GetQuestionSessionListAdminDto),
        {
          totalCount: 0,
          perPage: limit,
          pageNum: page,
          items: [],
        },
        {
          excludeExtraneousValues: true,
          enableImplicitConversion: true,
        },
      );
    }

    const users = await this.userRepository.findByIds(
      Array.from(new Set(sessions.map((s) => s.userId))),
    );
    const elapsedMsSessions =
      await this.questionSessionSegmentRepository.getElapsedMsByIds(
        sessions.map((s) => s.id),
      );
    const elapsedMsUsers =
      await this.questionSessionSegmentRepository.getElapsedMsByUserIds(
        Array.from(new Set(sessions.map((s) => s.userId))),
      );

    return plainToInstance(
      createPaginationDto(GetQuestionSessionListAdminDto),
      {
        items: sessions.map((session) => {
          const user = users.find((u) => u.id == session.userId);
          const elapsedMsSession = elapsedMsSessions.find(
            (e) => e.sessionId == session.id,
          );
          const elapsedMsUser = elapsedMsUsers.find(
            (e) => e.userId == session.userId,
          );
          return plainToInstance(
            GetQuestionSessionListAdminDto,
            {
              sessionId: session.id,
              sessionType: session.type,
              userId: user.id,
              userName: user.name,
              createdAt: session.createdAt,
              elapsedMs: elapsedMsSession ? elapsedMsSession.durationMs : 0,
              elapsedMs7d: elapsedMsUser ? elapsedMsUser.durationMs7Days : 0,
              elapsedMs30d: elapsedMsUser ? elapsedMsUser.durationMs30Days : 0,
              elapsedMsToday: elapsedMsUser ? elapsedMsUser.durationMsToday : 0,
              elapsedMsTotal: elapsedMsUser ? elapsedMsUser.durationMsTotal : 0,
            },
            { excludeExtraneousValues: true },
          );
        }),
        totalCount: Number(total),
        perPage: Number(limit),
        pageNum: Number(page),
      },
      {
        excludeExtraneousValues: true,
      },
    );
  }
}
