import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { User } from './user.entity';
import { SessionType } from 'src/common/constants/session-type.enum';
import { Question } from './question.entity';
import { QuestionSession } from './question-session.entity';
import { SubmissionAnswerRequestAppDto } from 'src/dtos/app/question/submission-answer-request.app.dto';

@Entity()
export class QuestionSessionMap extends BaseEntity {
  @ManyToOne(() => Question)
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column()
  questionId: number;

  @ManyToOne(() => QuestionSession, (qs) => qs.questionSessionMaps)
  @JoinColumn({ name: 'questionSessionId' })
  questionSession: QuestionSession;

  @Column()
  questionSessionId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column({ type: 'boolean', default: false, comment: '문제 정답 여부' })
  isCorrect: boolean;

  @Column({ type: 'boolean', default: false, comment: '문제 오픈 여부' })
  isOpened: boolean;

  @Column({ type: 'json', nullable: true, comment: '사용자 답안' })
  userAnswer: SubmissionAnswerRequestAppDto;
}
