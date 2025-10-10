import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { Answer } from './answer.entity';
import { Unit } from './unit.entity';
import { QuestionSessionMap } from './question-session-map.entity';

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

  @Column({ type: 'text', nullable: true, comment: '문제에 대한 추가 정보' })
  additionalText: string;

  // Question <-> Answer (1:N 관계)
  @OneToMany(() => Answer, (answer) => answer.question)
  answers: Answer[];

  @ManyToOne(() => Unit, (unit) => unit.questions, { nullable: false })
  @JoinColumn({ name: 'unitId' })
  unit: Unit;

  @Column()
  unitId: number;

  @OneToMany(() => QuestionSessionMap, (qsm) => qsm.question)
  questionSessionMaps: QuestionSessionMap[];
}
