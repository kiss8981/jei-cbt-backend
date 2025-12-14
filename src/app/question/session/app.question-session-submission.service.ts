import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { SessionType } from 'src/common/constants/session-type.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { SubmissionAnswerRequestAppDto } from 'src/dtos/app/question/submission-answer-request.app.dto';
import { SubmissionAnswerResponseAppDto } from 'src/dtos/app/question/submission-answer-response.app.dto';
import { Question } from 'src/entities/question.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { QuestionSessionMapRepository } from 'src/repositories/question-session-map.repository';
import { QuestionSessionRepository } from 'src/repositories/question-session.repository';
import { QuestionRepository } from 'src/repositories/question.repository';
import { collectMessages } from 'src/utils/validation';
import { AppQuestionWrongService } from '../wrong/app.question-wrong.service';
import { AppQuestionSharedService } from '../app.question-shared.service';

@Injectable()
export class AppQuestionSessionSubmissionService {
  constructor(
    private readonly appQuestionWrongService: AppQuestionWrongService,
    private readonly questionSessionMapRepository: QuestionSessionMapRepository,
    private readonly questionSessionRepository: QuestionSessionRepository,
    private readonly questionRepository: QuestionRepository,
    private readonly appQuestionSharedService: AppQuestionSharedService,
  ) {}

  async submitAnswer(
    userId: number,
    sessionId: number,
    questionMapId: number,
    answerDto: SubmissionAnswerRequestAppDto,
  ) {
    const session = await this.questionSessionRepository.findOneById(sessionId);

    const questionSessionMap =
      await this.questionSessionMapRepository.findById(questionMapId);
    const question = await this.questionRepository.findById(
      questionSessionMap.questionId,
    );

    if (
      !question ||
      questionSessionMap.userId != userId ||
      questionSessionMap.questionSessionId != sessionId
    ) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    const submissionDto = plainToInstance(SubmissionAnswerRequestAppDto, {
      ...answerDto,
      type: question.type,
    });

    const errors = await validate(submissionDto);

    if (errors.length > 0) {
      const messages = collectMessages(errors);
      const reason = messages.join(', ');

      throw new CustomHttpException({
        ...ErrorCodes.VALIDATION_FAILED,
        message: reason || 'Validation failed',
      });
    }

    const { isCorrect, explanation, answer } =
      await this.appQuestionSharedService.isAnswerCorrect(
        question,
        submissionDto,
      );

    await this.questionSessionMapRepository.updateById(questionMapId, {
      userAnswer: answerDto,
      isCorrect: isCorrect,
      answeredAt: new Date(),
    });

    if (!isCorrect) {
      await this.appQuestionWrongService.addWrongQuestion(userId, question.id);
    }

    switch (session.type) {
      case SessionType.UNIT:
      case SessionType.ALL:
        return plainToInstance(SubmissionAnswerResponseAppDto, {
          submissionId: questionMapId,
          isCorrect,
          explanation,
          answer,
        });
      case SessionType.MOCK:
        return plainToInstance(SubmissionAnswerResponseAppDto, {
          submissionId: questionMapId,
          isCorrect: null,
          explanation: null,
          answer: null,
        });
      default:
        break;
    }
  }
}
