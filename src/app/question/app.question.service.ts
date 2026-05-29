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
  GetMultipleShortAnswerQuestionAppDto,
  GetQuestionPhotoAppDto,
  GetShortAnswerQuestionAppDto,
  GetTrueFalseQuestionAppDto,
} from 'src/dtos/app/question/get-question.app.dto';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { PhotoMapRepository } from 'src/repositories/photo-map-repository';
import { QuestionRepository } from 'src/repositories/question.repository';

@Injectable()
export class AppQuestionService {
  constructor(
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
    private readonly photoMapRepository: PhotoMapRepository,
  ) {}

  async getQuestionById(questionId: number) {
    return this.questionResponseMapper(questionId);
  }

  private async questionResponseMapper(questionId: number) {
    const question = await this.questionRepository.findById(questionId);
    if (!question) throw new CustomHttpException(ErrorCodes.QUESTION_NOT_FOUND);
    const answers = await this.answerRepository.findByQuestionId(question.id);
    const photos = await this.getQuestionPhotos(question.id);
    const baseQuestion = {
      id: question.id,
      title: question.title,
      additionalText: question.additionalText,
      unitId: question.unitId,
      unitName: question.unit.name,
      createdAt: question.createdAt,
      photos,
    };

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return plainToInstance(
          GetTrueFalseQuestionAppDto,
          {
            ...baseQuestion,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MULTIPLE_CHOICE:
      case QuestionType.MULTIPLE_CHOICE_INPUT:
        return plainToInstance(
          GetMultipleChoiceQuestionAppDto,
          {
            ...baseQuestion,
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
            ...baseQuestion,
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
            ...baseQuestion,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.COMPLETION:
        return plainToInstance(
          GetCompletionQuestionAppDto,
          {
            ...baseQuestion,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        return plainToInstance(
          GetMultipleShortAnswerQuestionAppDto,
          {
            ...baseQuestion,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );

      case QuestionType.INTERVIEW:
        return plainToInstance(
          GetInterviewQuestionAppDto,
          {
            ...baseQuestion,
            type: question.type,
            question: question.title,
          },
          { excludeExtraneousValues: true },
        );
      default:
        break;
    }
  }

  private async getQuestionPhotos(questionId: number) {
    const photos = await this.photoMapRepository.findByQuestionId(questionId);

    return photos.map((photo) =>
      plainToInstance(
        GetQuestionPhotoAppDto,
        {
          id: photo.id,
          key: photo.key,
          originalFileName: photo.originalName,
          orderIndex: photo.orderIndex,
        },
        { excludeExtraneousValues: true },
      ),
    );
  }
}
