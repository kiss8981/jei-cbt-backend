import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { SessionType } from 'src/common/constants/session-type.enum';
import { QuestionSessionMap } from './question-session-map.entity';

@Entity()
export class QuestionSession extends BaseEntity {
  @OneToMany(() => User, (user) => user.questionSessions)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({
    enum: SessionType,
    type: 'enum',
  })
  type: SessionType;

  @ManyToOne(() => QuestionSessionMap, (qsm) => qsm.questionSession)
  questionSessionMaps: QuestionSessionMap[];

  @Column({ nullable: true, comment: '세션과 연관된 참조 ID (예: unit ID)' })
  referenceId: number;
}
