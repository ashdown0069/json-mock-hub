// 데코레이터 메타데이터 폴리필 — Nest를 부트스트랩하지 않고 메타데이터만 읽는다
import 'reflect-metadata';
import { RequestMethod } from '@nestjs/common';
import { METHOD_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import { FilebrowserController } from './filebrowser.controller';
import { MockStateController } from '../mockserver/mock-state.controller';
import { API_PATHS } from '@mcp/api-paths';

/**
 * MCP가 부르는 경로와 apps/api가 실제로 여는 경로를 대조한다.
 *
 * apps/mcp의 단위 테스트는 fetch를 스텁하고 URL 리터럴을 단언하므로,
 * apps/api가 라우트를 바꿔도 초록으로 통과한다. 두 앱 사이에 남는 유일한
 * 안전망이 이 스펙이다. 그래서 @mcp/api-paths를 모킹하지 않고 실제로 읽는다.
 *
 * DB·Redis 없이 동작한다 — 컨트롤러 클래스의 메타데이터만 읽기 때문이다.
 */

/** ":workspaceId" 접두어를 떼고 MCP가 만드는 상대 경로 형태로 맞춘다 */
function toRelativePath(raw: string): string {
  const collapsed = `/${raw}`.replace(/\/{2,}/g, '/');
  const withoutWorkspace = collapsed.replace('/:workspaceId', '');
  return withoutWorkspace.replace(/\/$/, '') || '/';
}

/** 컨트롤러의 모든 라우트를 "METHOD /상대경로" 문자열 배열로 뽑는다 */
function routesOf(controller: new (...args: never[]) => object): string[] {
  const prefix = Reflect.getMetadata(PATH_METADATA, controller) as string;
  const proto = controller.prototype as Record<string, unknown>;

  return Object.getOwnPropertyNames(proto)
    .filter((key) => key !== 'constructor')
    .flatMap((key) => {
      const handler = proto[key] as object;
      const path = Reflect.getMetadata(PATH_METADATA, handler) as
        | string
        | undefined;
      const method = Reflect.getMetadata(METHOD_METADATA, handler) as
        | number
        | undefined;
      if (path === undefined || method === undefined) return [];

      const methodName = RequestMethod[method] ?? String(method);
      return [`${methodName} ${toRelativePath(`${prefix}/${path}`)}`];
    });
}

describe('MCP ↔ API 라우트 계약', () => {
  const filebrowser = routesOf(FilebrowserController);
  const mockstate = routesOf(MockStateController);

  it('MCP가 부르는 filebrowser 경로 8개가 모두 실재한다', () => {
    expect(filebrowser).toContain(`GET ${API_PATHS.getItems('full')}`);
    expect(filebrowser).toContain(`GET ${API_PATHS.getItem(':itemId')}`);
    expect(filebrowser).toContain(`POST ${API_PATHS.createItem}`);
    expect(filebrowser).toContain(`PUT ${API_PATHS.updateItem}`);
    expect(filebrowser).toContain(`PATCH ${API_PATHS.renameItem}`);
    expect(filebrowser).toContain(`PATCH ${API_PATHS.moveItems}`);
    expect(filebrowser).toContain(`DELETE ${API_PATHS.deleteItems}`);
    expect(filebrowser).toContain(`POST ${API_PATHS.resetMockState}`);
  });

  it('MCP가 부르는 mockstate 경로가 실재한다', () => {
    expect(mockstate).toContain(`GET ${API_PATHS.effectiveJson}`);
  });

  // 경로 추출 자체가 망가지면 위 단언이 조용히 무의미해질 수 있다
  it('라우트 추출이 실제로 동작한다 (빈 배열이 아니다)', () => {
    expect(filebrowser.length).toBeGreaterThan(0);
    expect(mockstate.length).toBeGreaterThan(0);
  });
});
