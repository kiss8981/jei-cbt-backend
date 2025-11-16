import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import {
  GetCompletionQuestionAppDto,
  GetInterviewQuestionAppDto,
  GetMatchingQuestionAppDto,
  GetMultipleChoiceQuestionAppDto,
  GetShortAnswerQuestionAppDto,
  GetTrueFalseQuestionAppDto,
} from 'src/dtos/app/question/get-question.app.dto';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { QuestionRepository } from 'src/repositories/question.repository';

@Injectable()
export class AppQuestionService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
  ) {}

  async getQuestionById(questionId: number) {
    return this.questionResponseMapper(questionId);
  }

  private async questionResponseMapper(questionId: number) {
    const question = await this.questionRepository.findById(questionId);
    if (!question) throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
    const answers = await this.answerRepository.findByQuestionId(question.id);

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return plainToInstance(
          GetTrueFalseQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MULTIPLE_CHOICE:
        return plainToInstance(
          GetMultipleChoiceQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            isMultipleAnswer: answers.filter((a) => a.isCorrect).length > 1,
            type: question.type,
            question: question.title,
            choices: answers.map((answer) => ({
              id: answer.id,
              option: answer.content,
            })),
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MATCHING:
        return plainToInstance(
          GetMatchingQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            leftItems: answers
              .filter((answer) => !answer.pairingAnswerId)
              .sort(() => Math.random() - 0.5)
              .map((answer) => ({
                id: answer.id,
                option: answer.content,
              })),
            rightItems: answers
              .filter((answer) => answer.pairingAnswerId)
              .sort(() => Math.random() - 0.5)
              .map((answer) => ({
                id: answer.id,
                option: answer.content,
              })),
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.SHORT_ANSWER:
        return plainToInstance(
          GetShortAnswerQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.COMPLETION:
        return plainToInstance(
          GetCompletionQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        return plainToInstance(
          GetMultipleChoiceQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );

      case QuestionType.INTERVIEW:
        return plainToInstance(
          GetInterviewQuestionAppDto,
          {
            id: question.id,
            title: question.title,
            additionalText: question.additionalText,
            unitId: question.unitId,
            unitName: question.unit.name,
            createdAt: question.createdAt,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      default:
        break;
    }
  }
}
