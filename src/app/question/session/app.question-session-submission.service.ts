import { Injectable } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { SubmissionAnswerRequestAppDto } from 'src/dtos/app/question/submission-answer-request.app.dto';
import { Question } from 'src/entities/question.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';
import { QuestionSessionMapRepository } from 'src/repositories/question-session-map.repository';
import { QuestionRepository } from 'src/repositories/question.repository';

@Injectable()
export class AppQuestionSessionSubmissionService {
  constructor(
    private readonly questionSessionMapRepository: QuestionSessionMapRepository,
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
  ) {}

  async submitAnswer(
    userId: number,
    sessionId: number,
    questionMapId: number,
    answerDto: SubmissionAnswerRequestAppDto,
  ) {
    const questionSessionMap =
      await this.questionSessionMapRepository.findById(questionMapId);
    const question = await this.questionRepository.findById(
      questionSessionMap.questionId,
    );

    if (
      !question ||
      questionSessionMap.userId !== userId ||
      questionSessionMap.questionSessionId !== sessionId
    ) {
      throw new CustomHttpException(ErrorCodes.QUESTION_SESSION_NOT_FOUND);
    }

    const submissionDto = plainToInstance(SubmissionAnswerRequestAppDto, {
      ...answerDto,
      type: question.type,
    });

    const errors = await validate(submissionDto);

    if (errors.length > 0) {
      const reason = errors
        .flatMap((error) => Object.values(error.constraints || {}))
        .join(', ');

      throw new CustomHttpException({
        ...ErrorCodes.VALIDATION_FAILED,
        message: reason,
      });
    }
  }

  private async isAnswerCorrect(
    question: Question,
    userAnswer: SubmissionAnswerRequestAppDto,
  ) {
    const correctAnswers = await this.answerRepository.findByQuestionId(
      question.id,
    );

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return correctAnswers[0].isCorrect == userAnswer.answersForTrueFalse;
      case QuestionType.MULTIPLE_CHOICE:
        const correctOptionIds = correctAnswers
          .filter((ans) => ans.isCorrect)
          .map((ans) => ans.id);
        const isMultipleAnswer = correctOptionIds.length > 1 ? true : false;

        if (isMultipleAnswer) {
          if (
            userAnswer.answersForMultipleChoice.length !==
            correctOptionIds.length
          ) {
            return false;
          }
          return correctOptionIds.every((id) =>
            userAnswer.answersForMultipleChoice.includes(id),
          );
        } else {
          return (
            userAnswer.answersForMultipleChoice.length === 1 &&
            correctOptionIds[0] === userAnswer.answersForMultipleChoice[0]
          );
        }
      case QuestionType.MATCHING:
        const matchings = correctAnswers
          .filter((ans) => ans.pairingAnswerId != null)
          .map((ans) => ({
            leftId: ans.id,
            rightId: ans.pairingAnswerId,
          }));

        if (matchings.length !== userAnswer.answersForMatching.length) {
          return false;
        }

        return matchings.every((pair) =>
          userAnswer.answersForMatching.some(
            (userPair) =>
              userPair.leftItemId == pair.leftId &&
              userPair.rightItem == pair.rightId,
          ),
        );
    }
  }
}
