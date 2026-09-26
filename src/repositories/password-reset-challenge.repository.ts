import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PasswordResetChallenge } from 'src/entities/password-reset-challenge.entity';
import {
  EntityManager,
  IsNull,
  LessThan,
  MoreThan,
  Repository,
} from 'typeorm';

@Injectable()
export class PasswordResetChallengeRepository {
  constructor(
    @InjectRepository(PasswordResetChallenge)
    private readonly repository: Repository<PasswordResetChallenge>,
  ) {}

  findLatest(userId: number) {
    return this.repository.findOne({
      where: { userId },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
  }

  countCreatedSince(userId: number, since: Date) {
    return this.repository.count({
      where: { userId, createdAt: MoreThan(since) },
    });
  }

  async revokeActive(userId: number, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(PasswordResetChallenge)
      : this.repository;
    await repository
      .createQueryBuilder()
      .update(PasswordResetChallenge)
      .set({ revokedAt: new Date() })
      .where('userId = :userId', { userId })
      .andWhere('revokedAt IS NULL')
      .andWhere('consumedAt IS NULL')
      .execute();
  }

  createChallenge(
    input: Pick<
      PasswordResetChallenge,
      'userId' | 'code' | 'codeExpiresAt'
    >,
    manager?: EntityManager,
  ) {
    const repository = manager
      ? manager.getRepository(PasswordResetChallenge)
      : this.repository;
    return repository.save(
      repository.create({
        ...input,
        attemptCount: 0,
        verifiedAt: null,
        resetTokenHash: null,
        resetTokenExpiresAt: null,
        consumedAt: null,
        revokedAt: null,
      }),
    );
  }

  findLatestActiveWithCode(userId: number) {
    return this.repository
      .createQueryBuilder('challenge')
      .addSelect('challenge.code')
      .where('challenge.userId = :userId', { userId })
      .andWhere('challenge.deletedAt IS NULL')
      .andWhere('challenge.revokedAt IS NULL')
      .andWhere('challenge.consumedAt IS NULL')
      .andWhere('challenge.verifiedAt IS NULL')
      .orderBy('challenge.createdAt', 'DESC')
      .addOrderBy('challenge.id', 'DESC')
      .getOne();
  }

  incrementAttempt(id: number) {
    return this.repository.update(id, {
      attemptCount: () => 'attemptCount + 1',
    });
  }

  markVerified(
    id: number,
    resetTokenHash: string,
    resetTokenExpiresAt: Date,
  ) {
    return this.repository.update(id, {
      verifiedAt: new Date(),
      resetTokenHash,
      resetTokenExpiresAt,
    });
  }

  findByResetTokenHash(resetTokenHash: string) {
    return this.repository.findOne({
      where: {
        resetTokenHash,
        consumedAt: IsNull(),
        revokedAt: IsNull(),
      },
    });
  }

  markConsumed(id: number, manager?: EntityManager) {
    const repository = manager
      ? manager.getRepository(PasswordResetChallenge)
      : this.repository;
    return repository.update(id, { consumedAt: new Date() });
  }

  deleteOld(cutoff: Date) {
    return this.repository.softDelete({ codeExpiresAt: LessThan(cutoff) });
  }
}
