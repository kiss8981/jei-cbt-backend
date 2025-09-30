import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Question } from './question.entity';

@Entity()
export class Answer extends BaseEntity {
  @Column()
  questionId: number;

  @ManyToOne(() => Question, (question) => question.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column('text', { nullable: false, comment: '보기 내용 또는 정답 텍스트' })
  content: string;

  @Column('boolean', {
    default: false,
    comment: '이 항목이 정답인지 여부. (선다형: T/F, 단답형: T, 복수단답형: T)',
  })
  isCorrect: boolean;

  @Column('int', { default: 0, comment: '보기/항목의 순서 (선다형 1, 2, 3번)' })
  orderIndex: number;

  @Column('int', {
    nullable: true,
    comment: '연결형: 연결될 상대 항목(Answer)의 ID. (자기 참조)',
  })
  pairingAnswerId: number;
}
