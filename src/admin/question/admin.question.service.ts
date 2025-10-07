import { Injectable } from '@nestjs/common';
import { InjectEntityManager, InjectRepository } from '@nestjs/typeorm';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { CreateQuestionAdminDto } from 'src/dtos/admin/question/create-question.admin.dto';
import { Answer } from 'src/entities/answer.entity';
import { Question } from 'src/entities/question.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { QuestionRepository } from 'src/repositories/question.repository';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class AdminQuestionService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
    @InjectEntityManager()
    private readonly entityManager: EntityManager,
  ) {}

  async create(dto: CreateQuestionAdminDto) {
    await this.entityManager.transaction(async (manager) => {
      const question = await this.questionRepository.create(
        {
          title: dto.title,
          type: dto.type,
          explanation: dto.explanation,
          additionalText: dto.additionalText,
          unitId: dto.unitId,
        },
        manager,
      );

      switch (dto.type) {
        case QuestionType.TRUE_FALSE:
          const answer = await this.createTrueFalseQuestion(
            question,
            dto,
            manager,
          );
          question.answers = [answer];
          break;
        case QuestionType.MULTIPLE_CHOICE:
          const answers = await this.createMultipleChoiceQuestion(
            question,
            dto,
            manager,
          );
          question.answers = answers;
          break;
        case QuestionType.MATCHING:
          const matchingAnswers = await this.createMatchingQuestion(
            question,
            dto,
            manager,
          );
          question.answers = matchingAnswers;
          break;
        case QuestionType.SHORT_ANSWER:
          const shortAnswers = await this.createShortAnswerQuestion(
            question,
            dto,
            manager,
          );
          question.answers = shortAnswers;
          break;
        case QuestionType.COMPLETION:
          const completionAnswers = await this.createCompletionQuestion(
            question,
            dto,
            manager,
          );
          question.answers = completionAnswers;
          break;
        case QuestionType.MULTIPLE_SHORT_ANSWER:
          const multipleShortAnswers =
            await this.createMultipleShortAnswerQuestion(
              question,
              dto,
              manager,
            );
          question.answers = multipleShortAnswers;
          break;

        case QuestionType.INTERVIEW:
          const interviewAnswer = await this.createInterviewQuestion(
            question,
            dto,
            manager,
          );
          question.answers = [interviewAnswer];
          break;
        default:
          break;
      }
    });

    return { message: '문제가 성공적으로 생성되었습니다.' };
  }

  private async createTrueFalseQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    return this.answerRepository.create(
      {
        isCorrect: dto.answersForCorrectAnswerForTrueFalse,
        questionId: question.id,
      },
      entityManager,
    );
  }

  private async createMultipleChoiceQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const answerDto of dto.answersForMultipleChoice) {
      const answer = await this.answerRepository.create(
        {
          content: answerDto.content,
          isCorrect: answerDto.isCorrect,
          questionId: question.id,
        },
        entityManager,
      );
      answers.push(answer);
    }
    return answers;
  }

  private async createMatchingQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const answerDto of dto.answersForMatching) {
      const leftItem = await this.answerRepository.create(
        {
          content: answerDto.leftItem,
          questionId: question.id,
        },
        entityManager,
      );
      const rightItem = await this.answerRepository.create(
        {
          content: answerDto.rightItem,
          questionId: question.id,
          pairingAnswerId: leftItem.id,
        },
        entityManager,
      );
      answers.push(leftItem, rightItem);
    }
    return answers;
  }

  private async createShortAnswerQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const shortAnswer of dto.answersForShortAnswer) {
      const answer = await this.answerRepository.create(
        {
          content: shortAnswer,
          isCorrect: true,
          questionId: question.id,
        },
        entityManager,
      );
      answers.push(answer);
    }
    return answers;
  }

  private async createCompletionQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const answerDto of dto.answersForCompletion) {
      const answer = await this.answerRepository.create(
        {
          content: answerDto.content,
          isCorrect: answerDto.isCorrect,
          questionId: question.id,
        },
        entityManager,
      );
      answers.push(answer);
    }
    return answers;
  }

  private async createMultipleShortAnswerQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    const answers: Answer[] = [];
    for (const answerDto of dto.answersForMultipleShortAnswer) {
      const answer = await this.answerRepository.create(
        {
          content: answerDto.content,
          isCorrect: true,
          orderIndex: answerDto.orderIndex,
          questionId: question.id,
        },
        entityManager,
      );
      answers.push(answer);
    }
    return answers;
  }

  private async createInterviewQuestion(
    question: Question,
    dto: CreateQuestionAdminDto,
    entityManager: EntityManager,
  ) {
    return this.answerRepository.create(
      {
        content: dto.answersForInterview,
        isCorrect: true,
        questionId: question.id,
      },
      entityManager,
    );
  }
}
