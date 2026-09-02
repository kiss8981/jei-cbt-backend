import { AdminUploadService } from './admin.upload.service';
import { UploadPurpose } from 'src/common/constants/upload-purpose.enum';

describe('AdminUploadService', () => {
  const s3 = {
    getUploadPresignedUrl: jest.fn().mockResolvedValue('https://upload.test'),
    getPublicUrl: jest.fn((key: string) => `https://cdn.test/${key}`),
  };
  const photos = { create: jest.fn() };
  const assets = { create: jest.fn() };
  const service = new AdminUploadService(
    s3 as any,
    photos as any,
    assets as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('creates a notice upload using the shared endpoint contract', async () => {
    assets.create.mockResolvedValue({ id: 17 });
    const [result] = await service.getPresignedUrls(
      {
        purpose: UploadPurpose.NOTICE,
        files: [
          { fileName: 'guide.pdf', mimeType: 'application/pdf', size: 1024 },
        ],
      },
      3,
    );

    expect(result.uploadId).toBe(17);
    expect(result.key).toMatch(/^notices\/uploads\/.+\.pdf$/);
    expect(assets.create).toHaveBeenCalledWith(
      expect.objectContaining({ adminUserId: 3, originalName: 'guide.pdf' }),
    );
  });

  it('rejects unsupported notice files', async () => {
    await expect(
      service.getPresignedUrls(
        {
          purpose: UploadPurpose.NOTICE,
          files: [
            {
              fileName: 'danger.exe',
              mimeType: 'application/octet-stream',
              size: 1024,
            },
          ],
        },
        3,
      ),
    ).rejects.toBeDefined();
  });
});
