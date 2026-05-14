import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Question } from './question.entity';
import { Exam } from './exam.entity';

@Entity()
export class Unit extends BaseEntity {
  @Column()
  name: string;

  @Column({ default: true })
  isDisplayed: boolean;

  @Column({ nullable: true })
  examId: number | null;

  @ManyToMany(() => Exam, (exam) => exam.units)
  @JoinTable({
    name: 'unit_exams',
    joinColumn: {
      name: 'unitId',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'examId',
      referencedColumnName: 'id',
    },
  })
  exams: Exam[];

  @OneToMany(() => Question, (question) => question.unit)
  questions: Question[];
}
