import { Injectable } from '@nestjs/common';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { SubmissionAnswerRequestAppDto } from 'src/dtos/app/question/submission-answer-request.app.dto';
import { WrongAnswerRequestAppDto } from 'src/dtos/app/question/wrong-answer-request.app.dto';
import { Question } from 'src/entities/question.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';

@Injectable()
export class AppQuestionSharedService {
  constructor(private readonly answerRepository: AnswerRepository) {}

  private normalizeText(value: string) {
    return value.trim().toLowerCase();
  }

  private parseCommaSeparatedAnswers(value: string) {
    return Array.from(
      new Set(
        value
          .split(',')
          .map((item) => this.normalizeText(item))
          .filter(Boolean),
      ),
    ).sort();
  }

  public async getCorrectAnswerDetails(
    question: Question,
    userAnswer: SubmissionAnswerRequestAppDto,
  ): Promise<{
    explanation: string | null;
    answer: string | null;
    userAnswerMapped: string | null;
  }> {
    const correctAnswers = await this.answerRepository.findByQuestionId(
      question.id,
    );

    const explanation = question.explanation;
    let answer: string | null = null;
    let userAnswerMapped: string | null = null;

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        answer = correctAnswers[0].isCorrect ? '참' : '거짓';
        userAnswerMapped = userAnswer.answersForTrueFalse ? '참' : '거짓';
        break;

      case QuestionType.MULTIPLE_CHOICE:
        answer = correctAnswers
          .filter((ans) => ans.isCorrect)
          .map((ans) => ans.content)
          .join(', ');
        userAnswerMapped = correctAnswers
          .filter((ans) =>
            userAnswer.answersForMultipleChoice.includes(Number(ans.id)),
          )
          .map((ans) => ans.content)
          .join(', ');
        break;

      case QuestionType.MULTIPLE_CHOICE_INPUT:
        answer = correctAnswers
          .filter((ans) => ans.isCorrect)
          .map((ans) => ans.content)
          .join(', ');
        userAnswerMapped = userAnswer.answersForShortAnswer.trim();
        break;

      case QuestionType.MATCHING:
        answer = correctAnswers
          .filter((ans) => ans.pairingAnswerId != null)
          .map((ans) => ({
            leftName: ans.content,
            rightName: correctAnswers.find((a) => a.id == ans.pairingAnswerId)
              ?.content,
          }))
          .map((pair) => `${pair.leftName} - ${pair.rightName}`)
          .join(', ');
        userAnswerMapped = userAnswer.answersForMatching
          .map((userPair) => {
            const leftItem = correctAnswers.find(
              (ans) => ans.id == userPair.leftItemId,
            );
            const rightItem = correctAnswers.find(
              (ans) => ans.id == userPair.rightItemId,
            );
            return `${leftItem?.content || 'Unknown'} - ${rightItem?.content || 'Unknown'}`;
          })
          .join(', ');
        break;

      case QuestionType.SHORT_ANSWER:
        answer = correctAnswers.find((ans) => ans.isCorrect)?.content || null;
        userAnswerMapped = userAnswer.answersForShortAnswer.trim();
        break;

      case QuestionType.MULTIPLE_SHORT_ANSWER:
        const correctShortAnswerMap = new Map<number, string[]>();
        correctAnswers
          .filter((ans) => ans.isCorrect)
          .forEach((ans) => {
            const trimmedContent = ans.content.trim();
            if (correctShortAnswerMap.has(ans.orderIndex)) {
              correctShortAnswerMap.get(ans.orderIndex).push(trimmedContent);
            } else {
              correctShortAnswerMap.set(ans.orderIndex, [trimmedContent]);
            }
          });
        answer = Array.from(correctShortAnswerMap)
          .map(([index, answers]) => `${index + 1}: ${answers[0]}`)
          .join(', ');
        userAnswerMapped = userAnswer.answersForMultipleShortAnswer
          .map(
            (userAns) => `${userAns.orderIndex + 1}: ${userAns.content.trim()}`,
          )
          .join(', ');
        break;

      case QuestionType.INTERVIEW:
        answer = correctAnswers.find((ans) => ans.isCorrect)?.content || null;
        userAnswerMapped = userAnswer.answersForInterview.trim();
        break;
    }

    return {
      explanation,
      answer,
      userAnswerMapped,
    };
  }

  public async isAnswerCorrect(
    question: Question,
    userAnswer: SubmissionAnswerRequestAppDto | WrongAnswerRequestAppDto,
  ): Promise<{
    isCorrect: boolean;
    explanation: string | null;
    answer: string | null;
  }> {
    const correctAnswers = await this.answerRepository.findByQuestionId(
      question.id,
    );

    const { explanation, answer } = await this.getCorrectAnswerDetails(
      question,
      userAnswer as SubmissionAnswerRequestAppDto,
    );

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        return {
          isCorrect:
            correctAnswers[0].isCorrect == userAnswer.answersForTrueFalse,
          explanation,
          answer,
        };

      case QuestionType.MULTIPLE_CHOICE:
        const correctOptionIds = correctAnswers
          .filter((ans) => ans.isCorrect)
          .map((ans) => ans.id);
        const isMultipleAnswer = correctOptionIds.length > 1;

        if (isMultipleAnswer) {
          if (
            userAnswer.answersForMultipleChoice.length !==
            correctOptionIds.length
          ) {
            return {
              isCorrect: false,
              explanation,
              answer,
            };
          }

          return {
            isCorrect: correctOptionIds.every((id) =>
              userAnswer.answersForMultipleChoice.includes(Number(id)),
            ),
            explanation,
            answer,
          };
        }

        return {
          isCorrect:
            userAnswer.answersForMultipleChoice.length == 1 &&
            Number(correctOptionIds[0]) ==
              Number(userAnswer.answersForMultipleChoice[0]),
          explanation,
          answer,
        };

      case QuestionType.MULTIPLE_CHOICE_INPUT:
        const normalizedCorrectAnswers = correctAnswers
          .filter((ans) => ans.isCorrect)
          .map((ans) => this.normalizeText(ans.content))
          .sort();
        const normalizedUserAnswers = this.parseCommaSeparatedAnswers(
          userAnswer.answersForShortAnswer,
        );

        return {
          isCorrect:
            normalizedCorrectAnswers.length === normalizedUserAnswers.length &&
            normalizedCorrectAnswers.every(
              (value, index) => value === normalizedUserAnswers[index],
            ),
          explanation,
          answer,
        };

      case QuestionType.MATCHING:
        const matchings = correctAnswers
          .filter((ans) => ans.pairingAnswerId != null)
          .map((ans) => ({
            leftId: Number(ans.pairingAnswerId),
            rightId: Number(ans.id),
          }));

        if (matchings.length !== userAnswer.answersForMatching.length) {
          return {
            isCorrect: false,
            explanation,
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
          explanation,
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
          explanation,
          answer,
        };

      case QuestionType.MULTIPLE_SHORT_ANSWER:
        const correctShortAnswerMap = new Map<number, string[]>();
        correctAnswers
          .filter((ans) => ans.isCorrect)
          .forEach((ans) => {
            const trimmedContent = ans.content.trim();
            if (correctShortAnswerMap.has(ans.orderIndex)) {
              correctShortAnswerMap.get(ans.orderIndex).push(trimmedContent);
            } else {
              correctShortAnswerMap.set(ans.orderIndex, [trimmedContent]);
            }
          });

        return {
          isCorrect: userAnswer.answersForMultipleShortAnswer.every(
            (userAns) => {
              const correctShortAnswers =
                correctShortAnswerMap.get(userAns.orderIndex) || [];
              return correctShortAnswers.some(
                (ans) =>
                  ans.trim().toLowerCase() ===
                  userAns.content.trim().toLowerCase(),
              );
            },
          ),
          explanation,
          answer,
        };

      case QuestionType.INTERVIEW:
        return {
          isCorrect: true,
          explanation,
          answer,
        };
    }
  }
}
