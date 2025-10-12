import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Question } from './question.entity';

@Entity()
export class Unit extends BaseEntity {
  @Column()
  name: string;

  @Column({ default: true })
  isDisplayed: boolean;

  @OneToMany(() => Question, (question) => question.unit)
  questions: Question[];
}
