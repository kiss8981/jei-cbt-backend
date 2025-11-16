import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Question } from './question.entity';
import { User } from './user.entity';

@Entity()
export class QuestionWrong extends BaseEntity {
  @ManyToOne(() => Question, (question) => question.id)
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column()
  questionId: number;

  @ManyToOne(() => User, (user) => user.questionWrongs)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column()
  userId: number;

  @Column()
  wrongCount: number;

  @Column()
  lastWrongAt: Date;

  @Column({ default: false, comment: '복습 여부' })
  isReviewed: boolean;
}
