import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Question } from './question.entity';
import { Exam } from './exam.entity';

@Entity()
export class Unit extends BaseEntity {
  @Column()
  name: string;

  @Column({ default: true })
  isDisplayed: boolean;

  @ManyToOne(() => Exam, (exam) => exam.units, { nullable: true })
  @JoinColumn({ name: 'examId' })
  exam: Exam | null;

  @Column({ nullable: true })
  examId: number | null;

  @OneToMany(() => Question, (question) => question.unit)
  questions: Question[];
}
