import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';

@Entity()
@Index('IDX_password_reset_user_created', ['userId', 'createdAt'])
@Index('IDX_password_reset_code_expires', ['codeExpiresAt'])
export class PasswordResetChallenge extends BaseEntity {
  @Column({ type: 'bigint' })
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'varchar', length: 6, select: false })
  code: string;

  @Column({ type: 'datetime' })
  codeExpiresAt: Date;

  @Column({ type: 'tinyint', unsigned: true, default: 0 })
  attemptCount: number;

  @Column({ type: 'datetime', nullable: true })
  verifiedAt: Date | null;

  @Index('UX_password_reset_token_hash', { unique: true })
  @Column({ type: 'char', length: 64, nullable: true })
  resetTokenHash: string | null;

  @Column({ type: 'datetime', nullable: true })
  resetTokenExpiresAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  consumedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  revokedAt: Date | null;
}
