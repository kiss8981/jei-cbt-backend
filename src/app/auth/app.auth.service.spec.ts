import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { AppAuthService } from './app.auth.service';

describe('AppAuthService password reset', () => {
  const user = { id: 7, name: '홍길동', phone: '01012345678' };

  const createService = () => {
    const userRepository = {
      findOneByPhone: jest.fn(),
      updatePassword: jest.fn().mockResolvedValue(undefined),
    };
    const challengeRepository = {
      findLatest: jest.fn().mockResolvedValue(null),
      countCreatedSince: jest.fn().mockResolvedValue(0),
      revokeActive: jest.fn().mockResolvedValue(undefined),
      createChallenge: jest.fn().mockResolvedValue({ id: 1 }),
      findLatestActiveWithCode: jest.fn(),
      incrementAttempt: jest.fn().mockResolvedValue(undefined),
      markVerified: jest.fn().mockResolvedValue(undefined),
      findByResetTokenHash: jest.fn(),
      markConsumed: jest.fn().mockResolvedValue(undefined),
    };
    const notificationService = {
      enqueue: jest.fn().mockResolvedValue({ id: 1 }),
    };
    const manager = {};
    const entityManager = {
      transaction: jest.fn(async (callback) => callback(manager)),
    };
    const jwtService = {};
    const service = new AppAuthService(
      userRepository as any,
      jwtService as any,
      challengeRepository as any,
      notificationService as any,
      entityManager as any,
    );

    return {
      service,
      userRepository,
      challengeRepository,
      notificationService,
      entityManager,
    };
  };

  it('returns the generic result for an unknown phone without creating rows', async () => {
    const { service, userRepository, entityManager } = createService();
    userRepository.findOneByPhone.mockResolvedValue(null);

    await expect(
      service.requestPasswordReset({ phone: '01099999999' }),
    ).resolves.toBe(true);
    expect(entityManager.transaction).not.toHaveBeenCalled();
  });

  it('creates a six-digit challenge and matching pending notification atomically', async () => {
    const {
      service,
      userRepository,
      challengeRepository,
      notificationService,
      entityManager,
    } = createService();
    userRepository.findOneByPhone.mockResolvedValue(user);

    await service.requestPasswordReset({ phone: user.phone });

    const challengeInput = challengeRepository.createChallenge.mock.calls[0][0];
    const notificationInput = notificationService.enqueue.mock.calls[0][0];
    expect(challengeInput.code).toMatch(/^\d{6}$/);
    expect(challengeInput.userId).toBe(user.id);
    expect(notificationInput.payload).toEqual({
      '#{인증번호}': challengeInput.code,
    });
    expect(entityManager.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects an expired verification code without issuing a reset token', async () => {
    const { service, userRepository, challengeRepository } = createService();
    userRepository.findOneByPhone.mockResolvedValue(user);
    challengeRepository.findLatestActiveWithCode.mockResolvedValue({
      id: 1,
      code: '123123',
      codeExpiresAt: new Date(Date.now() - 1000),
      attemptCount: 0,
    });

    await expect(
      service.verifyPasswordReset({ phone: user.phone, code: '123123' }),
    ).rejects.toBeInstanceOf(CustomHttpException);
    expect(challengeRepository.markVerified).not.toHaveBeenCalled();
  });

  it('updates a bcrypt password once for a valid reset token', async () => {
    const { service, userRepository, challengeRepository } = createService();
    challengeRepository.findByResetTokenHash
      .mockResolvedValueOnce({
        id: 1,
        userId: user.id,
        resetTokenExpiresAt: new Date(Date.now() + 60_000),
        consumedAt: null,
        revokedAt: null,
      })
      .mockResolvedValueOnce(null);

    await expect(
      service.completePasswordReset({
        resetToken: 'valid-reset-token',
        password: 'new-password',
        passwordConfirmation: 'new-password',
      }),
    ).resolves.toBe(true);

    const savedHash = userRepository.updatePassword.mock.calls[0][1];
    expect(savedHash).not.toBe('new-password');
    expect(challengeRepository.markConsumed).toHaveBeenCalledWith(
      1,
      expect.anything(),
    );

    await expect(
      service.completePasswordReset({
        resetToken: 'valid-reset-token',
        password: 'new-password',
        passwordConfirmation: 'new-password',
      }),
    ).rejects.toBeInstanceOf(CustomHttpException);
  });
});
