import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { QuestionSession } from './question-session.entity';

@Entity()
@Index(['userId', 'sessionId'])
@Index('ux_qss_one_open_per_session', ['sessionId', 'openFlag'], {
  unique: true,
})
export class QuestionSessionSegment extends BaseEntity {
  @Column()
  userId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  sessionId: number;

  @ManyToOne(() => QuestionSession, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sessionId' })
  session: QuestionSession;

  @Column('datetime', { precision: 3 })
  startedAt: Date;

  @Column('datetime', { precision: 3, nullable: true })
  endedAt: Date | null;

  @Column({
    type: 'tinyint',
    asExpression: 'IF(`endedAt` IS NULL, 1, NULL)',
    generatedType: 'STORED',
    nullable: true, // 중요: NULL 허용
  })
  openFlag: number | null;
}
