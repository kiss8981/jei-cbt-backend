import { Expose, Type } from 'class-transformer';

export function createPaginationDto<T>(Cls: new () => T) {
  class PaginationDto {
    @Expose()
    totalCount: number;

    @Expose()
    perPage: number;

    @Expose()
    pageNum: number;

    @Expose()
    @Type(() => Cls)
    items: T[];
  }
  return PaginationDto;
}

export type PaginationRespDto<T> = InstanceType<
  ReturnType<typeof createPaginationDto<T>>
>;
