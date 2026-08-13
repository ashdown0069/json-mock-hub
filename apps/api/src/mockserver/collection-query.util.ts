import type { ResolvedMockParams } from '@workspace/types';

type Row = Record<string, unknown>;

/**
 * 아이템 옵션에서 파생된 컬렉션 쿼리 설정. null이면 해당 기능 비활성화.
 * @workspace/types의 ResolvedMockParams를 재사용해 계약이 어긋나지 않게 한다.
 */
export type CollectionQueryOptions = Pick<ResolvedMockParams, 'sort' | 'search'>;

/** 배열/중복 파라미터로 들어온 값을 첫 문자열 값으로 정규화한다. */
function firstValue(value: unknown): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === undefined || raw === null) return undefined;
  return String(raw);
}

/** 두 값을 숫자로 해석할 수 있으면 숫자로, 아니면 문자열로 비교한다(-1/0/1). */
function compareValues(a: unknown, b: unknown): number {
  if (a === b) return 0;
  const isNilA = a === null || a === undefined;
  const isNilB = b === null || b === undefined;
  if (isNilA && isNilB) return 0;
  if (isNilA) return 1;
  if (isNilB) return -1;

  const na = Number(a);
  const nb = Number(b);
  if (
    typeof a !== 'boolean' &&
    typeof b !== 'boolean' &&
    a !== '' &&
    b !== '' &&
    Number.isFinite(na) &&
    Number.isFinite(nb)
  ) {
    return na - nb;
  }
  return String(a).localeCompare(String(b));
}

/** 행의 모든 값 중 하나라도 검색어를 부분포함하면 true (대소문자 무시). */
function matchesSearch(row: Row, term: string): boolean {
  const lowered = term.toLowerCase();
  return Object.values(row).some((v) => {
    if (v === null || v === undefined) return false;
    return String(v).toLowerCase().includes(lowered);
  });
}

/**
 * 컬렉션 데이터에 검색 → 정렬을 순서대로 적용한다.
 * 각 기능은 아이템 옵션(options)에서 활성화된 경우에만 동작하며,
 * 설정된 파라미터명으로만 쿼리를 읽는다. 그 외 쿼리 파라미터는 모두 무시한다.
 * 페이지네이션은 호출부(paginateArray)에서 별도로 수행한다. 원본 배열은 변형하지 않는다.
 */
export function applyCollectionQuery(
  data: unknown[],
  query: Record<string, unknown>,
  options: CollectionQueryOptions,
): Row[] {
  const safeQuery = query || {};
  let rows = (Array.isArray(data) ? data : []).filter(
    (r): r is Row => typeof r === 'object' && r !== null,
  );

  if (options?.search) {
    const term = firstValue(safeQuery[options.search.searchParam]);
    if (term) {
      rows = rows.filter((row) => matchesSearch(row, term));
    }
  }

  if (options?.sort) {
    const sortField = firstValue(safeQuery[options.sort.sortParam]);
    if (sortField) {
      const desc =
        firstValue(safeQuery[options.sort.orderParam])?.toLowerCase() === 'desc';
      rows = [...rows].sort((a, b) => {
        const cmp = compareValues(a[sortField], b[sortField]);
        return desc ? -cmp : cmp;
      });
    }
  }

  return rows;
}

