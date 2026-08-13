import { Injectable, NotFoundException } from '@nestjs/common';
import { resolveMockApiParams } from '@workspace/types';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  FileBrowserItem,
  FileBrowserItemDocument,
} from '../database/schema/file-browser-item.schema';
import {
  normalizeMockPath,
  splitIdSegment,
  paginateArray,
  PaginatedBody,
} from './mockserver.util';
import { applyCollectionQuery } from './collection-query.util';
import { MockStateService } from './mock-state.service';
import {
  applyOverlay,
  applyCreate,
  applyUpdate,
  applyDelete,
  MAX_OVERLAY_CREATED_ROWS,
  type ApplyCreateResult,
} from './mock-state.util';

export interface MockResponse {
  status: number;
  body: unknown;
}

@Injectable()
export class MockserverService {
  constructor(
    @InjectModel(FileBrowserItem.name)
    private readonly itemModel: Model<FileBrowserItemDocument>,
    private readonly mockStateService: MockStateService,
  ) {}

  /**
   * 대시보드 미리보기용 — 저장된 base JSON에 현재 Redis 오버레이를 병합한
   * "실효 컬렉션"을 반환합니다. CRUD 요청과 동일한 applyOverlay 규칙을 쓰므로
   * 실제 mock 응답과 항상 같은 값을 보여줍니다.
   */
  async getEffectiveJson(
    workspaceId: string,
    path: string,
  ): Promise<unknown[]> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    const normalizedPath = normalizeMockPath(path);

    const item = await this.itemModel
      .findOne({
        workspace: wsObjectId,
        path: normalizedPath,
        itemType: 'File',
      })
      .lean()
      .exec();

    if (!item) {
      throw new NotFoundException({
        message: `경로 "${normalizedPath}"에 해당하는 Mock API 파일을 찾을 수 없습니다.`,
      });
    }

    const baseJson: unknown[] = Array.isArray(item.json) ? item.json : [];
    const overlay = await this.mockStateService.getOverlay(
      workspaceId,
      normalizedPath,
    );
    return applyOverlay(baseJson, overlay);
  }

  /**
   * 서브도메인에서 추출된 workspaceId와 요청 경로(rawPath)를 바탕으로 파일 데이터베이스를 조회하여 응답을 결정합니다.
   */
  async resolveRequest(
    workspaceId: string,
    rawPath: string,
    method: string,
    query: Record<string, unknown>,
    reqBody: unknown,
  ): Promise<MockResponse> {
    const wsObjectId = new Types.ObjectId(workspaceId);
    const path = normalizeMockPath(rawPath);

    // 1차 조회: 요청 경로가 파일의 정규화된 경로와 완벽히 일치하는 경우 (예: /users)
    const exactItem = await this.itemModel
      .findOne({ workspace: wsObjectId, path, itemType: 'File' })
      .lean()
      .exec();

    if (exactItem) {
      return this.buildItemResponse(workspaceId, exactItem, method, null, query, reqBody);
    }

    // 2차 조회: 마지막 세그먼트를 개별 리소스 ID로 간주하고 부모 경로로 재조회 (예: /users/3 -> 부모 /users, ID 3)
    const seg = splitIdSegment(path);
    if (seg) {
      const parentItem = await this.itemModel
        .findOne({
          workspace: wsObjectId,
          path: seg.parentPath,
          itemType: 'File',
        })
        .lean()
        .exec();

      if (parentItem) {
        return this.buildItemResponse(
          workspaceId,
          parentItem,
          method,
          seg.id,
          query,
          reqBody,
        );
      }
    }

    // 매칭되는 파일이 없는 경우 404 예외 발생
    throw new NotFoundException({
      message: `경로 "${path}"에 해당하는 Mock API를 찾을 수 없습니다.`,
    });
  }

  /**
   * 찾아낸 FileBrowserItem 데이터와 HTTP 메소드를 바탕으로 json-server 형식의 응답 구조를 생성합니다.
   */
  private async buildItemResponse(
    workspaceId: string,
    item: FileBrowserItem,
    method: string,
    resourceId: string | null,
    query: Record<string, unknown>,
    reqBody: unknown,
  ): Promise<MockResponse> {
    const baseJson: unknown[] = Array.isArray(item.json) ? item.json : [];
    const upperMethod = method.toUpperCase();

    // MockStateService는 MockStateModule로 항상 주입된다(@Optional 아님)
    const overlay = await this.mockStateService.getOverlay(
      workspaceId,
      item.path,
    );

    const effective = applyOverlay(baseJson, overlay);

    // ID가 주어지지 않은 컬렉션 단위의 요청 (예: GET /users, POST /users)
    if (!resourceId) {
      if (upperMethod === 'GET') {
        // 아이템 옵션을 공유 계약으로 해석한다 (@workspace/types)
        const params = resolveMockApiParams(item.options);
        const filtered = applyCollectionQuery(effective, query, params);

        if (params.pagination) {
          const paginated: PaginatedBody = paginateArray(
            filtered,
            query,
            params.pagination,
          );
          return { status: 200, body: paginated };
        }
        return { status: 200, body: filtered };
      }

      if (upperMethod === 'POST') {
        const bodyObj = (typeof reqBody === 'object' && reqBody !== null ? reqBody : {}) as Record<string, unknown>;

        const outcome = await this.mockStateService.mutate<ApplyCreateResult>(
          workspaceId,
          item.path,
          (current) => {
            // 락 안에서 다시 읽은 오버레이로 계산해야 동시 요청이 만든 행이
            // 사라지지 않는다. applyCreate가 base로부터 직접 실효본을 만든다.
            const res = applyCreate(current, baseJson, bodyObj);
            return { overlay: res.ok ? res.overlay : null, result: res };
          },
        );

        if (!outcome.ok) {
          if (outcome.reason === 'conflict') {
            return {
              status: 409,
              body: {
                message: `id "${String(bodyObj.id)}" 리소스가 이미 존재합니다.`,
              },
            };
          }
          return {
            status: 429,
            body: {
              message: `이 컬렉션의 mock 편집 상태가 상한(${MAX_OVERLAY_CREATED_ROWS}행)에 도달했습니다. 초기화 후 다시 시도해 주세요.`,
            },
          };
        }
        return { status: 201, body: outcome.created };
      }
    }

    // ID가 주어진 단일 리소스 요청 (예: GET /users/3, PUT /users/3, DELETE /users/3)
    if (resourceId) {
      if (upperMethod === 'GET') {
        const found = effective.find((row: any) => String(row?.id) === resourceId);
        if (!found) {
          return {
            status: 404,
            body: { message: `id "${resourceId}" 리소스를 찾을 수 없습니다.` },
          };
        }
        return { status: 200, body: found };
      }

      if (upperMethod === 'PUT' || upperMethod === 'PATCH') {
        const bodyObj = (typeof reqBody === 'object' && reqBody !== null ? reqBody : {}) as Record<string, unknown>;
        const mode = upperMethod === 'PUT' ? 'put' : 'patch';

        const updated = await this.mockStateService.mutate(
          workspaceId,
          item.path,
          (current) => {
            const res = applyUpdate(
              current,
              baseJson,
              resourceId,
              bodyObj,
              mode,
            );
            // 대상이 없으면 overlay: null로 저장을 건너뛴다
            return {
              overlay: res ? res.overlay : null,
              result: res ? res.updated : null,
            };
          },
        );

        if (!updated) {
          return {
            status: 404,
            body: { message: `id "${resourceId}" 리소스를 찾을 수 없습니다.` },
          };
        }
        return { status: 200, body: updated };
      }

      if (upperMethod === 'DELETE') {
        const deleted = await this.mockStateService.mutate(
          workspaceId,
          item.path,
          (current) => {
            const nextOverlay = applyDelete(current, baseJson, resourceId);
            return { overlay: nextOverlay, result: nextOverlay !== null };
          },
        );

        if (!deleted) {
          return {
            status: 404,
            body: { message: `id "${resourceId}" 리소스를 찾을 수 없습니다.` },
          };
        }
        return { status: 200, body: {} };
      }
    }

    // 지원하지 않는 부적합한 HTTP 메소드에 대한 응답
    return {
      status: 405,
      body: { message: `지원하지 않는 메소드입니다: ${method}` },
    };
  }
}
