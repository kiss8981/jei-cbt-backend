import { Column, Entity, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { QuestionDetail } from './question-detail.entity';
import { Answer } from './answer.entity';

@Entity()
export class Question extends BaseEntity {
  @Column({
    type: 'enum',
    enum: QuestionType,
    nullable: false,
    comment: '문제 유형 (진위형, 선다형, 연결형 등)',
  })
  type: QuestionType;

  @Column('text', { nullable: false, comment: '문제 제목 또는 내용' })
  title: string;

  @Column('text', { nullable: true, comment: '문제 해설' })
  explanation: string;

  // 관계 설정
  // Question <-> QuestionDetail (1:1 관계)
  @OneToOne(() => QuestionDetail, (detail) => detail.question)
  @JoinColumn()
  detail: QuestionDetail;

  // Question <-> Answer (1:N 관계)
  @OneToMany(() => Answer, (answer) => answer.question)
  answers: Answer[];
}
