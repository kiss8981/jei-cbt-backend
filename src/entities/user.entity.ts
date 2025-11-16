import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { QuestionSession } from './question-session.entity';
import { QuestionWrong } from './question-wrong.entity';

@Entity()
export class User extends BaseEntity {
  @Column()
  name: string;

  @Column({ unique: true })
  phone: string;

  @Column()
  password: string;

  @OneToMany(() => QuestionSession, (questionSession) => questionSession.user)
  questionSessions: QuestionSession[];

  @OneToMany(() => QuestionWrong, (questionWrong) => questionWrong.user)
  questionWrongs: QuestionWrong[];
}
