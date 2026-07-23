import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FileBrowserItem,
  FileBrowserItemDocument,
} from 'src/database/schema/file-browser-item.schema';
import {
  RequestLog,
  RequestLogDocument,
} from 'src/database/schema/request-log.schema';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(FileBrowserItem.name)
    private readonly itemModel: Model<FileBrowserItemDocument>,
    @InjectModel(RequestLog.name)
    private readonly requestLogModel: Model<RequestLogDocument>,
  ) {}

  async getStats(workspaceId: string) {
    // workspaceId 유효성은 가드(WorkspaceMemberGuard)에서 이미 검증됨
    const workspace = new Types.ObjectId(workspaceId);
    const since = new Date(Date.now() - DAY_MS);
    const [totalRoutes, requestVolume24h] = await Promise.all([
      this.itemModel.countDocuments({ workspace, itemType: 'File' }).exec(),
      this.requestLogModel
        .countDocuments({ workspace, createdAt: { $gte: since } })
        .exec(),
    ]);
    return { totalRoutes, requestVolume24h };
  }

  async getLogs(workspaceId: string, page: number, limit: number) {
    const workspace = new Types.ObjectId(workspaceId);
    const [data, totalItems] = await Promise.all([
      this.requestLogModel
        .find({ workspace })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.requestLogModel.countDocuments({ workspace }).exec(),
    ]);
    const totalPages = Math.max(1, Math.ceil(totalItems / limit));
    return {
      data,
      meta: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }
}
