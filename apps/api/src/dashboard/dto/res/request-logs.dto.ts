import { Exclude, Expose, Transform, Type } from 'class-transformer';

@Exclude()
export class RequestLogItemDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose() method: string;
  @Expose() path: string;
  @Expose() status: number;
  @Expose() ip: string | null;
  @Expose() createdAt: Date;
}

@Exclude()
export class LogsMetaDto {
  @Expose() page: number;
  @Expose() limit: number;
  @Expose() totalItems: number;
  @Expose() totalPages: number;
  @Expose() hasNext: boolean;
  @Expose() hasPrev: boolean;
}

@Exclude()
export class GetRequestLogsDto {
  @Expose() @Type(() => RequestLogItemDto) data: RequestLogItemDto[];
  @Expose() @Type(() => LogsMetaDto) meta: LogsMetaDto;
}
