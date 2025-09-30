import { Column, Entity, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Question } from './question.entity';

@Entity()
export class QuestionDetail extends BaseEntity {
  @Column({ unique: true })
  questionId: number;

  @OneToOne(() => Question, (question) => question.detail, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column('boolean', {
    nullable: true,
    comment: '순수단답형/복수단답형: 대소문자 구분 여부',
  })
  isCaseSensitive: boolean;

  @Column('boolean', {
    nullable: true,
    comment: '복수단답형/완성형: 복수 정답 허용 시 사용 가능',
  })
  allowPartialCredit: boolean;

  @Column('text', {
    nullable: true,
    comment: '완성형 빈칸 텍스트, 면접형 가이드라인 등 추가 정보',
  })
  additionalText: string;
}
