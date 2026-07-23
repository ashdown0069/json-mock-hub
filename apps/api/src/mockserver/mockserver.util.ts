export interface PaginationMeta {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedBody {
  data: unknown[];
  meta: PaginationMeta;
}

/**
 * Host 헤더와 Base 도메인을 비교하여 서브도메인(workspaceId)을 추출합니다.
 * 호스트명은 대소문자를 구분하지 않으므로 모두 소문자로 정규화해서 판별합니다.
 * 다중 레벨 서브도메인이거나 도메인 자체가 일치하지 않는 경우 null을 반환합니다.
 */
export function extractWorkspaceId(
  hostHeader: string | undefined,
  baseDomain: string,
): string | null {
  if (!hostHeader) return null;

  // 포트 번호를 제거하고 순수 호스트명을 소문자로 추출합니다.
  const host = (hostHeader.split(':')[0] ?? '').toLowerCase();
  const base = (baseDomain.split(':')[0] ?? '').toLowerCase();

  // 베이스 도메인으로 끝나지 않거나, 베이스 도메인과 서브도메인 구분자(.)가 없는 경우
  if (!base || !host.endsWith(`.${base}`)) return null;

  // 베이스 도메인 앞부분의 서브도메인 문자열을 잘라냅니다.
  const subdomain = host.slice(0, host.length - base.length - 1);

  // 다중 레벨 서브도메인(예: a.b.myrealm.cloud)은 워크스페이스로 취급하지 않음
  if (!subdomain || subdomain.includes('.')) return null;

  return subdomain;
}

/**
 * 요청 경로를 FileBrowserItem의 path 규격에 맞게 정규화합니다.
 * 1. URL 인코딩된 경로를 디코딩합니다.
 * 2. 프리픽스인 '/api'를 제거합니다.
 * 3. 마지막 슬래시(/) 트레일링 문자를 제거합니다.
 */
export function normalizeMockPath(rawPath: string): string {
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    // 디코딩 실패 시 원본 문자열을 그대로 사용합니다.
  }

  // '/api'로 시작하는 앞부분을 제거합니다. 빈 문자열인 경우 루트(/)로 세팅합니다.
  const withoutPrefix = decoded.replace(/^\/api/, '') || '/';

  // 트레일링 슬래시가 붙어 있다면 제거하되, 단일 루트 '/'만 있는 경우는 제외합니다.
  if (withoutPrefix.length > 1 && withoutPrefix.endsWith('/')) {
    return withoutPrefix.slice(0, -1);
  }
  return withoutPrefix;
}

/**
 * 경로의 마지막 세그먼트를 ID값으로 분리합니다.
 * 예: "/users/3" -> { parentPath: "/users", id: "3" }
 * 분리할 세그먼트가 없는 경우(단일 세그먼트) null을 반환합니다.
 */
export function splitIdSegment(
  path: string,
): { parentPath: string; id: string } | null {
  const lastSlash = path.lastIndexOf('/');
  // 루트 경로이거나 세그먼트가 존재하지 않는 경우 분리할 수 없음
  if (lastSlash <= 0) return null;

  const id = path.slice(lastSlash + 1);
  if (!id) return null;

  return { parentPath: path.slice(0, lastSlash), id };
}

const MAX_LIMIT = 100;

/**
 * 데이터 배열을 받아 쿼리 파라미터와 옵션 설정을 바탕으로 페이지네이션 처리를 수행합니다.
 * 지정한 파라미터명(기본값 page, limit)을 읽어서 데이터를 자르고 메타데이터를 조립합니다.
 */
export function paginateArray(
  data: unknown[],
  query: Record<string, unknown>,
  params?: { pageParam?: string; limitParam?: string },
): PaginatedBody {
  // 사용자가 설정한 커스텀 파라미터명이 있으면 읽고, 없으면 기본 파라미터명을 사용합니다.
  const pageKey = params?.pageParam || 'page';
  const limitKey = params?.limitParam || 'limit';

  const rawPage = parseInt(String(query[pageKey] ?? '1'), 10);
  const rawLimit = parseInt(String(query[limitKey] ?? '10'), 10);

  // 최소 1페이지, limit 하한은 1로 보장합니다.
  const page = Math.max(1, Number.isNaN(rawPage) ? 1 : rawPage);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number.isNaN(rawLimit) ? 10 : rawLimit),
  );

  const totalItems = data.length;
  // 전체 페이지 수를 계산합니다. (항상 최소 1페이지 보장)
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const start = (page - 1) * limit;

  return {
    data: data.slice(start, start + limit),
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

/**
 * x-forwarded-host 헤더 값을 단일 호스트 문자열로 정규화합니다.
 * 다단 프록시에서는 값이 배열이거나 콤마로 결합("client-host, proxy-host")될 수 있으므로,
 * 항상 첫 번째(클라이언트에 가장 가까운) 값을 취하고 앞뒤 공백을 제거합니다.
 * 유효한 값이 없으면 undefined를 반환합니다.
 */
export function firstForwardedHost(
  value: string | string[] | undefined,
): string | undefined {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const first = (raw ?? '').split(',')[0]?.trim();
  return first || undefined;
}
