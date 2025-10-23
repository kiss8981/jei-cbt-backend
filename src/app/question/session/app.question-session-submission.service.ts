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

@Injectable()
export class AppQuestionSessionSubmissionService {
  constructor(
    private readonly questionSessionMapRepository: QuestionSessionMapRepository,
    private readonly questionSessionRepository: QuestionSessionRepository,
    private readonly questionRepository: QuestionRepository,
    private readonly answerRepository: AnswerRepository,
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

    const { isCorrect, explanation, answer } = await this.isAnswerCorrect(
      question,
      submissionDto,
    );

    await this.questionSessionMapRepository.updateById(questionMapId, {
      userAnswer: answerDto,
      isCorrect: isCorrect,
      answeredAt: new Date(),
    });

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

  private async isAnswerCorrect(
    question: Question,
    userAnswer: SubmissionAnswerRequestAppDto,
  ): Promise<{
    isCorrect: boolean;
    explanation: string | null;
    answer: string | null;
  }> {
    const correctAnswers = await this.answerRepository.findByQuestionId(
      question.id,
    );

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return {
          isCorrect:
            correctAnswers[0].isCorrect == userAnswer.answersForTrueFalse,
          explanation: question.explanation,
          answer: correctAnswers[0].isCorrect ? '참' : '거짓',
        };
      case QuestionType.MULTIPLE_CHOICE:
        const correctOptionIds = correctAnswers
          .filter((ans) => ans.isCorrect)
          .map((ans) => ans.id);
        const isMultipleAnswer = correctOptionIds.length > 1 ? true : false;

        if (isMultipleAnswer) {
          const answer = correctAnswers
            .filter((ans) => ans.isCorrect)
            .map((ans) => ans.content)
            .join(', ');

          if (
            userAnswer.answersForMultipleChoice.length !==
            correctOptionIds.length
          ) {
            return {
              isCorrect: false,
              explanation: question.explanation,
              answer,
            };
          }

          return {
            isCorrect: correctOptionIds.every((id) =>
              userAnswer.answersForMultipleChoice.includes(Number(id)),
            ),
            explanation: question.explanation,
            answer,
          };
        } else {
          return {
            isCorrect:
              userAnswer.answersForMultipleChoice.length == 1 &&
              Number(correctOptionIds[0]) ==
                Number(userAnswer.answersForMultipleChoice[0]),
            explanation: question.explanation,
            answer: correctAnswers.find((ans) => ans.isCorrect).content,
          };
        }
      case QuestionType.MATCHING:
        const matchings = correctAnswers
          .filter((ans) => ans.pairingAnswerId != null)
          .map((ans) => ({
            leftId: Number(ans.pairingAnswerId),
            leftName: ans.content,
            rightId: Number(ans.id),
            rightName: correctAnswers.find((a) => a.id == ans.pairingAnswerId)
              .content,
          }));
        const answer = matchings
          .map((pair) => `${pair.leftName} - ${pair.rightName}`)
          .join(', ');

        if (matchings.length !== userAnswer.answersForMatching.length) {
          return {
            isCorrect: false,
            explanation: question.explanation,
            answer,
          };
        }

        return {
          isCorrect: matchings.every((pair) =>
            userAnswer.answersForMatching.some(
              (userPair) =>
                userPair.leftItemId == pair.leftId &&
                userPair.rightItemId == pair.rightId,
            ),
          ),
          explanation: question.explanation,
          answer,
        };
      case QuestionType.SHORT_ANSWER:
        const correctShortAnswer = correctAnswers.find(
          (ans) => ans.isCorrect,
        )?.content;
        return {
          isCorrect:
            correctShortAnswer.trim().toLowerCase() ==
            userAnswer.answersForShortAnswer.trim().toLowerCase(),
          explanation: question.explanation,
          answer: correctShortAnswer,
        };
      case QuestionType.MULTIPLE_SHORT_ANSWER:
        const correctShortAnswerMap = new Map<number, string[]>();
        correctAnswers
          .filter((ans) => ans.isCorrect)
          .forEach((ans) => {
            if (correctShortAnswerMap.has(ans.orderIndex)) {
              correctShortAnswerMap
                .get(ans.orderIndex)
                .push(ans.content.trim());
            } else {
              correctShortAnswerMap.set(ans.orderIndex, [ans.content.trim()]);
            }
          });

        const answerForMultipleShort = Array.from(correctShortAnswerMap)
          .map(([index, answers]) => `${index + 1}: ${answers[0]}`)
          .join(', ');

        const isCorrect = userAnswer.answersForMultipleShortAnswer.every(
          (userAns) => {
            const correctShortAnswers =
              correctShortAnswerMap.get(userAns.orderIndex) || [];
            return correctShortAnswers.some(
              (ans) =>
                ans.trim().toLowerCase() ===
                userAns.content.trim().toLowerCase(),
            );
          },
        );

        return {
          isCorrect,
          explanation: question.explanation,
          answer: answerForMultipleShort,
        };
      case QuestionType.INTERVIEW:
        const correctInterviewAnswer = correctAnswers.find(
          (ans) => ans.isCorrect,
        )?.content;
        return {
          isCorrect: true,
          explanation: question.explanation,
          answer: correctInterviewAnswer,
        };
    }
  }
}
