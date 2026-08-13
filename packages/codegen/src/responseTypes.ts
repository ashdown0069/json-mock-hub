/**
 * 생성 코드가 선언하는 응답·쿼리 인터페이스 문자열.
 *
 * axios/fetch 두 빌더가 공유하므로 어느 한쪽에 두면 반대쪽이 그 파일을
 * import해야 한다. PaginatedMeta 필드가 바뀌면 여기만 고친다.
 */

/** 페이지네이션 목록 응답 타입 선언 (mockserver의 PaginatedBody와 동일 형태) */
export function paginatedResponseInterface(typeName: string): string {
  return [
    `export interface ${typeName}ListResponse {`,
    `  data: ${typeName}[];`,
    `  meta: {`,
    `    page: number;`,
    `    limit: number;`,
    `    totalItems: number;`,
    `    totalPages: number;`,
    `    hasNext: boolean;`,
    `    hasPrev: boolean;`,
    `  };`,
    `}`,
  ].join("\n")
}

/** 활성화된 정렬·검색 옵션 파라미터만 담는 쿼리 타입 선언 (필터 기능 제거됨) */
export function listQueryInterface(
  typeName: string,
  sort: { sortParam: string; orderParam: string } | null,
  search: { searchParam: string } | null
): string {
  const fields: string[] = []

  if (sort) {
    fields.push(
      `  /** 정렬 기준 필드명 (예: createdAt) */`,
      `  ${JSON.stringify(sort.sortParam)}?: string;`,
      `  ${JSON.stringify(sort.orderParam)}?: "asc" | "desc";`
    )
  }

  if (search) {
    fields.push(
      `  /** 전문검색 키워드 */`,
      `  ${JSON.stringify(search.searchParam)}?: string;`
    )
  }

  return [
    `export interface ${typeName}ListQuery {`,
    ...fields,
    `}`,
  ].join("\n")
}
