// 여러 feature(mock-api, code-gen, file-browser)가 공유하는 스키마 도메인 타입

/**
 * 원시 타입 목록 (단일 진실 원천).
 *
 * 여기에 값을 추가하면 satisfies Record<SchemaPrimitive, ...>를 쓰는 모든 매핑에서
 * 컴파일 에러가 난다 — codegen의 TS/zod/yup/joi 매핑, mockgen의 값 생성기,
 * faker 카탈로그. 어느 하나를 빠뜨리고 배포할 수 없게 하는 것이 목적이다.
 */
export const SCHEMA_PRIMITIVES = [
  "string",
  "number",
  "boolean",
  "date",
  "uuid",
] as const

// 기본 타입 이름
export type SchemaPrimitive = (typeof SCHEMA_PRIMITIVES)[number]

/** 저장소 값마다 호출되므로 조회를 O(1)로 고정한다. 목록은 로드 후 불변이라 캐시가 안전하다. */
const SCHEMA_PRIMITIVE_SET: ReadonlySet<string> = new Set(SCHEMA_PRIMITIVES)

/**
 * 런타임에 유입된 값(저장소 역직렬화, DTO 전송, 클라이언트 입력 등)이
 * 현재 시스템에서 지원하는 원시 타입인지 판정한다.
 *
 * 외부 입력이나 동적 스키마 변환 과정에서 미지원 타입(예: objectId)이나
 * 오타가 그대로 통과하면 생성기·코드생성기에서 예상치 못한 null 또는 unknown이
 * 발생할 수 있으므로, 단순 타입 캐스팅 대신 이 타입 가드로 안전하게 검증해야 한다.
 */
export function isSchemaPrimitive(value: unknown): value is SchemaPrimitive {
  return typeof value === "string" && SCHEMA_PRIMITIVE_SET.has(value)
}

// 배열 타입: { type: "array", items: ... }
export interface SchemaArrayType {
  type: "array"
  items: SchemaType
}

// 하나의 필드가 가질 수 있는 타입 = 기본타입 | 배열 | 중첩 객체(재귀)
export type SchemaType = SchemaPrimitive | SchemaArrayType | SchemaObject

// 스키마 자체: key -> 타입
export interface SchemaObject {
  [key: string]: SchemaType
}

// 단일 객체 및 컬렉션 리소스 구분 타입
export type MockResourceType = "collection" | "object"

/** 실효 목데이터 타입 (배열 또는 단일 객체) */
export type EffectiveMockJson = unknown[] | Record<string, unknown>

// Mock API 생성 시 설정할 수 있는 옵션 구조 (페이지네이션·정렬·검색 정보 포함)
export interface MockApiOptions {
  /** 리소스 타입 (기본값: 'collection') */
  resourceType?: MockResourceType
  pagination: boolean
  paginationParams?: {
    pageParam: string
    limitParam: string
  }
  /** 정렬 기능 활성화 여부 (기본 false) */
  sort?: boolean
  sortParams?: {
    sortParam: string
    orderParam: string
  }
  /** 전문검색 기능 활성화 여부 (기본 false) */
  search?: boolean
  searchParams?: {
    searchParam: string
  }
}

/**
 * UI·생성·변환 로직이 공유하는 필드 타입 목록 (단일 진실 원천).
 * 원시 타입에 object/array를 더한 것이므로 SCHEMA_PRIMITIVES에서 파생시킨다 —
 * 독립 나열이면 원시 타입 추가 시 한쪽만 고치는 실수가 조용히 통과한다.
 */
export const FIELD_TYPES = [...SCHEMA_PRIMITIVES, "object", "array"] as const

export type FieldType = (typeof FIELD_TYPES)[number]

export interface FieldSchema {
  id: string
  name: string
  type: FieldType
  fakerMethod?: string
  fields?: FieldSchema[] // object/array(객체 배열) 중첩용
  arrayItemType?: SchemaPrimitive // 스칼라 배열의 원소 타입 (예: number 배열의 "number")
}

/**
 * 스키마·목데이터의 중첩 전개 최대 깊이 (단일 진실 원천).
 *
 * 두 축이 갈리면 "생성된 검증 코드가 자기 목데이터를 거부"한다 —
 * 스키마를 20단계까지 보존하면서 데이터를 8단계에서 절단하면,
 * codegen이 만든 z.object(...)가 목서버가 반환하는 {}를 거부한다.
 *
 * 값을 8로 두는 이유: 실측상 깊이 10 × count 50이면 리프 약 295만 개(약 62MB)가
 * 되고, 웹은 메인 스레드 동기 실행이라 탭이 먼저 멎는다.
 *
 * 소비처: mockgen(convertSchema, generateData), codegen(schemaToType, validationSnippets)
 */
export const MAX_SCHEMA_DEPTH = 8

