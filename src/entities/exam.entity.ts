import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { ExamType } from 'src/common/constants/exam-type.enum';
import { Unit } from './unit.entity';

@Entity()
export class Exam extends BaseEntity {
  @Column({
    type: 'enum',
    enum: ExamType,
  })
  type: ExamType;

  @Column()
  title: string;

  @Column({ default: true })
  isDisplayed: boolean;

  @OneToMany(() => Unit, (unit) => unit.exam)
  units: Unit[];
}
