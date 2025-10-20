import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Question } from './question.entity';

@Entity()
export class PhotoMap extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  key: string;

  @Column({ type: 'text', nullable: true })
  originalName: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mimeType: string;

  @Column({ type: 'int', nullable: true })
  size: number;

  @Column({ type: 'int', nullable: true })
  orderIndex: number;

  @ManyToOne(() => Question, (question) => question.photoMaps, {
    nullable: true,
  })
  @JoinColumn({ name: 'questionId' })
  question: Question;

  @Column({ nullable: true })
  questionId: number;
}
