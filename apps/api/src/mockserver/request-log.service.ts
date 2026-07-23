import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  RequestLog,
  RequestLogDocument,
} from 'src/database/schema/request-log.schema';

const LOGGABLE_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);

@Injectable()
export class RequestLogService {
  private readonly logger = new Logger(RequestLogService.name);

  constructor(
    @InjectModel(RequestLog.name)
    private readonly requestLogModel: Model<RequestLogDocument>,
  ) {}

  /**
   * fire-and-forget 저장 — await 하지 않으며, 실패는 경고 로그만 남긴다.
   * mock 응답 지연에 영향을 주지 않기 위한 설계.
   */
  record(entry: {
    workspaceId: string;
    method: string;
    path: string;
    status: number;
    ip?: string | null;
  }): void {
    const method = entry.method.toUpperCase();
    if (!LOGGABLE_METHODS.has(method)) return;
    if (!Types.ObjectId.isValid(entry.workspaceId)) return;

    void this.requestLogModel
      .create({
        workspace: new Types.ObjectId(entry.workspaceId),
        method,
        path: entry.path,
        status: entry.status,
        ip: entry.ip ?? null,
      })
      .catch((err) =>
        this.logger.warn(`요청 로그 저장 실패: ${err?.message ?? err}`),
      );
  }
}
