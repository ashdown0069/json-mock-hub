import { Injectable, NotFoundException } from '@nestjs/common';
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

export interface MockResponse {
  status: number;
  body: unknown;
}

@Injectable()
export class MockserverService {
  constructor(
    @InjectModel(FileBrowserItem.name)
    private readonly itemModel: Model<FileBrowserItemDocument>,
  ) {}

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
      return this.buildItemResponse(exactItem, method, null, query, reqBody);
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
  private buildItemResponse(
    item: FileBrowserItem,
    method: string,
    resourceId: string | null,
    query: Record<string, unknown>,
    reqBody: unknown,
  ): MockResponse {
    const json: unknown[] = Array.isArray(item.json) ? item.json : [];
    const upperMethod = method.toUpperCase();

    // ID가 주어지지 않은 컬렉션 단위의 요청 (예: GET /users, POST /users)
    if (!resourceId) {
      if (upperMethod === 'GET') {
        // 페이지네이션 옵션이 활성화된 경우 페이징 처리된 객체로 감싸서 반환합니다.
        if (item.options?.pagination) {
          const paginated: PaginatedBody = paginateArray(
            json,
            query,
            item.options.paginationParams,
          );
          return { status: 200, body: paginated };
        }
        // 페이지네이션 비활성화 상태에서는 전체 JSON 배열을 그대로 반환합니다.
        return { status: 200, body: json };
      }

      if (upperMethod === 'POST') {
        // POST 리소스 생성: json-server 관례에 따라 요청 페이로드를 생성 성공 상태(201)로 에코 반환합니다.
        return { status: 201, body: reqBody ?? {} };
      }
    }

    // ID가 주어진 단일 리소스 요청 (예: GET /users/3, PUT /users/3, DELETE /users/3)
    if (resourceId) {
      if (upperMethod === 'GET') {
        // 배열 내에서 해당 ID와 일치하는 데이터를 찾습니다.
        const found = json.find((row: any) => String(row?.id) === resourceId);
        if (!found) {
          return {
            status: 404,
            body: { message: `id "${resourceId}" 리소스를 찾을 수 없습니다.` },
          };
        }
        return { status: 200, body: found };
      }

      if (upperMethod === 'PUT' || upperMethod === 'PATCH') {
        // 병합(Merge) 응답: 기존 정보와 수정을 요청한 페이로드를 병합해서 반환합니다.
        const existing = json.find(
          (row: any) => String(row?.id) === resourceId,
        );
        // GET과 동일하게, 존재하지 않는 리소스에 대한 수정은 404로 응답합니다 (json-server 관례).
        if (!existing) {
          return {
            status: 404,
            body: { message: `id "${resourceId}" 리소스를 찾을 수 없습니다.` },
          };
        }
        return {
          status: 200,
          // id는 URL 세그먼트 문자열이 아니라 저장된 레코드의 값을 유지한다
          // (GET 단건 응답과 타입 일관성 확보 + 클라이언트의 id 변조 방지)
          body: { ...(existing as any), ...(reqBody as any), id: (existing as any).id },
        };
      }

      if (upperMethod === 'DELETE') {
        // 삭제 성공 시 빈 객체를 반환합니다.
        return { status: 200, body: {} };
      }
    }

    // 지원하지 않는 부적합한 HTTP 메소드에 대한 응답
    return {
      status: 405,
      body: { message: `${upperMethod} 메서드는 지원하지 않습니다.` },
    };
  }
}
