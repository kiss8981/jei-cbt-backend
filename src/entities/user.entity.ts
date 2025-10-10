import { Column, Entity, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { QuestionSession } from './question-session.entity';

@Entity()
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  password: string;

  @ManyToOne(() => QuestionSession, (questionSession) => questionSession.user)
  questionSessions: QuestionSession[];
}
