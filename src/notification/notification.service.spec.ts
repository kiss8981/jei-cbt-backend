import { NotificationStatus } from 'src/common/constants/notification-status.enum';
import { NotificationType } from 'src/common/constants/notification-type.enum';
import { NotificationService } from './notification.service';

jest.mock('./message.constants', () => ({
  MESSAGE_TEMPLATES: {
    PHONE_VERIFICATION: {
      type: 'PHONE_VERIFICATION',
      templateId: 'test-template-id',
      payload: ['#{인증번호}'],
    },
  },
}));

describe('NotificationService', () => {
  const pending = (id: number) => ({
    id,
    phone: '01012345678',
    type: NotificationType.PHONE_VERIFICATION,
    payload: { '#{인증번호}': '123123' },
    status: NotificationStatus.PENDING,
  });

  const createService = (rows = [pending(1)]) => {
    const repository = {
      findPendingByTypes: jest.fn().mockResolvedValue(rows),
      markSent: jest.fn().mockResolvedValue(undefined),
      markFailed: jest.fn().mockResolvedValue(undefined),
      createPending: jest.fn(),
      deleteOld: jest.fn(),
    };
    const solapi = { sendOne: jest.fn().mockResolvedValue(undefined) };

    return {
      service: new NotificationService(repository as any, solapi as any),
      repository,
      solapi,
    };
  };

  it('filters pending rows by the requested types and limits the query to 50', async () => {
    const { service, repository } = createService();

    await service.send({ types: [NotificationType.PHONE_VERIFICATION] });

    expect(repository.findPendingByTypes).toHaveBeenCalledWith(
      [NotificationType.PHONE_VERIFICATION],
      50,
    );
  });

  it('sends only the registered template id and variables', async () => {
    const { service, solapi } = createService();

    await service.send({ types: [NotificationType.PHONE_VERIFICATION] });

    expect(solapi.sendOne).toHaveBeenCalledWith({
      phone: '01012345678',
      templateId: 'test-template-id',
      payload: { '#{인증번호}': '123123' },
    });
    expect(solapi.sendOne.mock.calls[0][0]).not.toHaveProperty('text');
  });

  it('continues sending after one notification fails', async () => {
    const { service, repository, solapi } = createService([
      pending(1),
      pending(2),
    ]);
    solapi.sendOne
      .mockRejectedValueOnce(new Error('temporary failure'))
      .mockResolvedValueOnce(undefined);

    await service.send({ types: [NotificationType.PHONE_VERIFICATION] });

    expect(solapi.sendOne).toHaveBeenCalledTimes(2);
    expect(repository.markFailed).toHaveBeenCalledWith(
      1,
      expect.any(Date),
      'temporary failure',
    );
    expect(repository.markSent).toHaveBeenCalledWith(2, expect.any(Date));
  });
});
