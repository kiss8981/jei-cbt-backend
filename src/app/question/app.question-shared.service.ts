import { Injectable } from '@nestjs/common';
import { QuestionType } from 'src/common/constants/question-type.enum';
import { SubmissionAnswerRequestAppDto } from 'src/dtos/app/question/submission-answer-request.app.dto';
import { WrongAnswerRequestAppDto } from 'src/dtos/app/question/wrong-answer-request.app.dto';
import { Question } from 'src/entities/question.entity';
import { AnswerRepository } from 'src/repositories/answer.repository';

@Injectable()
export class AppQuestionSharedService {
  constructor(private readonly answerRepository: AnswerRepository) {}

  /**
   * 질문 유형에 따라 정답 텍스트와 설명을 반환합니다.
   * 사용자 답변의 정답 여부와는 관계없이 순수한 정답 정보를 제공합니다.
   */
  /**
   * 질문 유형에 따라 정답 텍스트, 설명, 그리고 사용자 답변의 매핑된 텍스트를 반환합니다.
   */
  public async getCorrectAnswerDetails(
    question: Question,
    userAnswer: SubmissionAnswerRequestAppDto, // userAnswer를 인수로 추가
  ): Promise<{
    explanation: string | null;
    answer: string | null; // 정답 텍스트
    userAnswerMapped: string | null; // 사용자 답변 매핑 텍스트
  }> {
    const correctAnswers = await this.answerRepository.findByQuestionId(
      question.id,
    );

    const explanation = question.explanation;
    let answer: string | null = null;
    let userAnswerMapped: string | null = null; // 사용자 답변을 매핑할 변수

    switch (question.type) {
      case QuestionType.TRUE_FALSE:
        // 정답 매핑
        answer = correctAnswers[0].isCorrect ? '참' : '거짓';
        // 사용자 답변 매핑
        userAnswerMapped = userAnswer.answersForTrueFalse ? '참' : '거짓';
        break;

      case QuestionType.MULTIPLE_CHOICE:
        // 정답 매핑 (정답 옵션들의 내용)
        const correctOptions = correctAnswers.filter((ans) => ans.isCorrect);
        answer = correctOptions.map((ans) => ans.content).join(', ');

        // 사용자 답변 매핑 (사용자가 선택한 옵션 ID에 해당하는 내용)
        const userOptions = correctAnswers.filter((ans) =>
          userAnswer.answersForMultipleChoice.includes(Number(ans.id)),
        );
        userAnswerMapped = userOptions.map((ans) => ans.content).join(', ');
        break;

      case QuestionType.MATCHING:
        // 정답 매핑
        const correctMatchings = correctAnswers
          .filter((ans) => ans.pairingAnswerId != null)
          .map((ans) => ({
            leftName: ans.content,
            rightName: correctAnswers.find((a) => a.id == ans.pairingAnswerId)
              ?.content,
          }));
        answer = correctMatchings
          .map((pair) => `${pair.leftName} - ${pair.rightName}`)
          .join(', ');

        // 사용자 답변 매핑 (사용자가 제출한 ID 쌍에 해당하는 내용)
        const userMatchings = userAnswer.answersForMatching.map((userPair) => {
          const leftItem = correctAnswers.find(
            (ans) => ans.id == userPair.leftItemId,
          );
          const rightItem = correctAnswers.find(
            (ans) => ans.id == userPair.rightItemId,
          );
          return `${leftItem?.content || 'Unknown'} - ${rightItem?.content || 'Unknown'}`;
        });
        userAnswerMapped = userMatchings.join(', ');
        break;

      case QuestionType.SHORT_ANSWER:
        // 정답 매핑
        answer = correctAnswers.find((ans) => ans.isCorrect)?.content || null;
        // 사용자 답변 매핑
        userAnswerMapped = userAnswer.answersForShortAnswer.trim();
        break;

      case QuestionType.MULTIPLE_SHORT_ANSWER:
        // 정답 매핑
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

        // 사용자 답변 매핑 (순서(orderIndex)별로 사용자가 제출한 내용)
        userAnswerMapped = userAnswer.answersForMultipleShortAnswer
          .map(
            (userAns) => `${userAns.orderIndex + 1}: ${userAns.content.trim()}`,
          )
          .join(', ');
        break;

      case QuestionType.INTERVIEW:
        // 정답 매핑
        answer = correctAnswers.find((ans) => ans.isCorrect)?.content || null;
        // 사용자 답변 매핑 (사용자가 제출한 내용)
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

    // 새로 분리된 함수를 호출하여 정답 정보 (explanation, answer 텍스트)를 가져옴
    const { explanation, answer, userAnswerMapped } =
      await this.getCorrectAnswerDetails(question, userAnswer);

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

          const isCorrect = correctOptionIds.every((id) =>
            userAnswer.answersForMultipleChoice.includes(Number(id)),
          );

          return {
            isCorrect,
            explanation,
            answer,
          };
        } else {
          return {
            isCorrect:
              userAnswer.answersForMultipleChoice.length == 1 &&
              Number(correctOptionIds[0]) ==
                Number(userAnswer.answersForMultipleChoice[0]),
            explanation,
            answer,
          };
        }
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

        const isMatchingCorrect = matchings.every((pair) =>
          userAnswer.answersForMatching.some(
            (userPair) =>
              userPair.leftItemId == pair.leftId &&
              userPair.rightItemId == pair.rightId,
          ),
        );

        return {
          isCorrect: isMatchingCorrect,
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

        const isCorrectMultipleShortAnswer =
          userAnswer.answersForMultipleShortAnswer.every((userAns) => {
            const correctShortAnswers =
              correctShortAnswerMap.get(userAns.orderIndex) || [];
            return correctShortAnswers.some(
              (ans) =>
                ans.trim().toLowerCase() ===
                userAns.content.trim().toLowerCase(),
            );
          });

        return {
          isCorrect: isCorrectMultipleShortAnswer,
          explanation,
          answer,
        };
      case QuestionType.INTERVIEW:
        return {
          isCorrect: true, // 인터뷰는 보통 채점 불가로 간주
          explanation,
          answer,
        };
    }
  }
}
