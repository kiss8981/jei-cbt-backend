import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import sanitizeHtml = require('sanitize-html');
import { ErrorCodes } from 'src/common/constants/error-code.enum';
import { NoticeAssetStatus } from 'src/common/constants/notice-asset.enum';
import { CustomHttpException } from 'src/common/filters/custom-http.exception';
import { WriteNoticeAdminDto } from 'src/dtos/admin/notice/write-notice.admin.dto';
import { AwsS3ApiAdapter } from 'src/external/aws-s3/aws-s3.api.adapter';
import { NoticeAssetRepository } from 'src/repositories/notice-asset.repository';
import { NoticeRepository } from 'src/repositories/notice.repository';

@Injectable()
export class NoticeService {
  constructor(
    private readonly noticeRepository: NoticeRepository,
    private readonly assetRepository: NoticeAssetRepository,
    private readonly s3: AwsS3ApiAdapter,
  ) {}

  async getAdminList(
    page: number,
    limit: number,
    filters: { keyword?: string; isPublished?: boolean },
  ) {
    const [items, totalCount] = await this.noticeRepository.findAndCount(
      page,
      limit,
      filters,
    );
    return {
      items: items.map((notice) => this.present(notice, false)),
      totalCount,
      perPage: limit,
      pageNum: page,
    };
  }

  async getPublicList(page: number, limit: number, keyword?: string) {
    const [items, totalCount] = await this.noticeRepository.findAndCount(
      page,
      limit,
      { keyword, isPublished: true },
    );
    return {
      items: items.map((notice) => this.present(notice, false)),
      totalCount,
      perPage: limit,
      pageNum: page,
    };
  }

  async getOne(id: number, publishedOnly = false) {
    const notice = await this.noticeRepository.findOneById(id, publishedOnly);
    if (!notice) throw new CustomHttpException(ErrorCodes.NOTICE_NOT_FOUND);
    return this.present(notice, true);
  }

  async create(dto: WriteNoticeAdminDto, adminUserId: number) {
    const normalized = await this.validateAndNormalize(dto, adminUserId);
    const notice = await this.noticeRepository.create({
      title: dto.title.trim(),
      contentHtml: normalized.contentHtml,
      isPublished: dto.isPublished,
      adminUserId,
    });
    await this.assetRepository.attach(dto.assetIds, notice.id);
    return this.getOne(notice.id);
  }

  async update(id: number, dto: WriteNoticeAdminDto, adminUserId: number) {
    const existing = await this.noticeRepository.findOneById(id);
    if (!existing) throw new CustomHttpException(ErrorCodes.NOTICE_NOT_FOUND);
    const normalized = await this.validateAndNormalize(dto, adminUserId, id);
    const currentIds = existing.assets?.map((asset) => Number(asset.id)) ?? [];
    const removedIds = currentIds.filter(
      (assetId) => !dto.assetIds.includes(assetId),
    );

    await this.noticeRepository.update(id, {
      title: dto.title.trim(),
      contentHtml: normalized.contentHtml,
      isPublished: dto.isPublished,
    });
    await this.assetRepository.attach(dto.assetIds, id);
    await this.assetRepository.markPendingDelete(removedIds);
    return this.getOne(id);
  }

  async delete(id: number) {
    const notice = await this.noticeRepository.findOneById(id);
    if (!notice) throw new CustomHttpException(ErrorCodes.NOTICE_NOT_FOUND);
    await this.assetRepository.markPendingDelete(
      notice.assets?.map((asset) => Number(asset.id)) ?? [],
    );
    await this.noticeRepository.softDelete(id);
    return { success: true };
  }

  private async validateAndNormalize(
    dto: WriteNoticeAdminDto,
    adminUserId: number,
    noticeId?: number,
  ) {
    if (!dto.title.trim()) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }
    const assets = await this.assetRepository.findByIds(dto.assetIds);
    if (assets.length !== dto.assetIds.length) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }
    const invalid = assets.some(
      (asset) =>
        Number(asset.adminUserId) !== Number(adminUserId) ||
        !(
          asset.status === NoticeAssetStatus.TEMP ||
          (asset.status === NoticeAssetStatus.ATTACHED &&
            Number(asset.noticeId) === Number(noticeId))
        ),
    );
    if (invalid) throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);

    const tempAssets = assets.filter(
      (asset) => asset.status === NoticeAssetStatus.TEMP,
    );
    const exists = await Promise.all(
      tempAssets.map((asset) => this.s3.objectExists(asset.key)),
    );
    if (exists.some((value) => !value)) {
      throw new CustomHttpException(ErrorCodes.S3_FILE_GET_ERROR);
    }

    const assetUrls = new Map(
      assets.map((asset) => [
        Number(asset.id),
        this.s3.getPublicUrl(asset.key),
      ]),
    );
    const contentHtml = this.sanitize(dto.contentHtml, assetUrls);
    const embeddedIds = Array.from(
      contentHtml.matchAll(/data-asset-id=["'](\d+)["']/g),
      (match) => Number(match[1]),
    );
    const uniqueEmbeddedIds = [...new Set(embeddedIds)].sort((a, b) => a - b);
    const sortedAssetIds = [...dto.assetIds].sort((a, b) => a - b);
    if (
      uniqueEmbeddedIds.length !== sortedAssetIds.length ||
      uniqueEmbeddedIds.some(
        (assetId, index) => assetId !== sortedAssetIds[index],
      )
    ) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }
    if (
      assets.some(
        (asset) => !contentHtml.includes(this.s3.getPublicUrl(asset.key)),
      )
    ) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }

    const text = contentHtml
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;|&#160;/gi, ' ')
      .trim();
    if (!text && dto.assetIds.length === 0) {
      throw new CustomHttpException(ErrorCodes.VALIDATION_FAILED);
    }
    return { contentHtml };
  }

  private sanitize(html: string, assetUrls = new Map<number, string>()) {
    return sanitizeHtml(html, {
      allowedTags: [
        'p',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'strong',
        'em',
        'u',
        's',
        'ul',
        'ol',
        'li',
        'a',
        'img',
        'pre',
        'code',
        'blockquote',
        'br',
        'div',
        'span',
        'mark',
        'label',
        'input',
      ],
      allowedAttributes: {
        '*': ['class', 'style', 'data-asset-id', 'data-type', 'data-checked'],
        a: ['href', 'target', 'rel', 'download', 'data-asset-id'],
        img: ['src', 'alt', 'width', 'height', 'data-asset-id'],
        div: [
          'data-file-link',
          'data-asset-id',
          'data-file-name',
          'data-file-size',
        ],
        input: ['type', 'checked', 'disabled'],
      },
      allowedSchemes: ['http', 'https', 'mailto'],
      allowedStyles: {
        '*': {
          color: [/^#[0-9a-f]{3,8}$/i, /^rgb/],
          'background-color': [/^#[0-9a-f]{3,8}$/i, /^rgb/],
          'font-size': [/^\d+(?:px|rem|em|%)$/],
          'text-align': [/^(left|right|center|justify)$/],
          width: [/^\d+(?:px|%)$/],
          height: [/^\d+(?:px|%)$/],
        },
      },
      transformTags: {
        a: (_tagName, attribs) => {
          const assetId = Number(attribs['data-asset-id']);
          return {
            tagName: 'a',
            attribs: {
              ...attribs,
              ...(assetUrls.has(assetId)
                ? { href: assetUrls.get(assetId) }
                : {}),
              rel: 'noopener noreferrer',
            },
          };
        },
        img: (_tagName, attribs) => {
          const assetId = Number(attribs['data-asset-id']);
          return {
            tagName: 'img',
            attribs: {
              ...attribs,
              ...(assetUrls.has(assetId)
                ? { src: assetUrls.get(assetId) }
                : {}),
            },
          };
        },
      },
      exclusiveFilter: (frame) => {
        if (frame.tag !== 'img') return false;
        const assetId = Number(frame.attribs['data-asset-id']);
        return !assetUrls.has(assetId);
      },
    });
  }

  private present(notice: any, includeContent: boolean) {
    return {
      id: Number(notice.id),
      title: notice.title,
      ...(includeContent ? { contentHtml: notice.contentHtml } : {}),
      isPublished: notice.isPublished,
      authorName: notice.adminUser?.name ?? '',
      attachmentCount: notice.assets?.length ?? 0,
      assets: includeContent
        ? (notice.assets ?? []).map((asset) => ({
            id: Number(asset.id),
            key: asset.key,
            publicUrl: this.s3.getPublicUrl(asset.key),
            originalName: asset.originalName,
            mimeType: asset.mimeType,
            size: Number(asset.size),
            kind: asset.kind,
            orderIndex: asset.orderIndex,
          }))
        : undefined,
      createdAt: notice.createdAt,
      updatedAt: notice.updatedAt,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupAssets() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const assets = await this.assetRepository.findCleanupCandidates(cutoff);
    for (const asset of assets) {
      try {
        await this.s3.deleteObject(asset.key);
        await this.assetRepository.softDelete(asset.id);
      } catch {
        // 다음 정기 실행에서 재시도한다.
      }
    }
  }
}
