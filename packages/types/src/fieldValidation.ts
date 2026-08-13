// 필드명 중복 판정의 단일 진실 원천.
// 웹 스키마 에디터와 NestJS DTO 검증기가 이 파일 하나만 바라본다 —
// 어느 한쪽에서 규칙을 다시 구현하면 UI는 통과시키고 서버는 거부하는(또는 그 반대)
// 조용한 불일치가 생긴다.

import { FieldSchema, MAX_SCHEMA_DEPTH } from "./schema"

/**
 * 중복 판정이 요구하는 최소 구조.
 *
 * 백엔드 DTO의 fieldDefs는 `Record<string, any>[]`라서 FieldSchema로 단정할 수 없다.
 * name을 unknown으로 둔 것은 의도적이다 — 문자열이 아닌 값이 들어와도
 * 이 함수가 던지지 않고 판정에서 제외해야 한다.
 */
export interface FieldLike {
  id?: string
  name?: unknown
  fields?: readonly FieldLike[]
}

/** 판정에 쓸 이름. 문자열이 아니거나 trim 결과가 비면 null(= 판정 제외). */
function toComparableName(field: FieldLike): string | null {
  if (typeof field.name !== "string") return null
  const trimmed = field.name.trim()
  return trimmed === "" ? null : trimmed
}

/**
 * 형제 스코프별로 이름이 겹치는 필드를 찾아 visit에 넘긴다.
 *
 * 각 중첩 레벨이 독립된 스코프다 — user.name과 company.name은 겹치지 않는다.
 * 깊이는 MAX_SCHEMA_DEPTH에서 끊는다. 그 아래는 fieldsToSchema가 어차피
 * 잘라내므로 검사할 대상이 없고, 서버는 임의 JSON을 받으므로 방어가 필요하다.
 */
function walkDuplicates(
  fields: readonly FieldLike[] | undefined,
  visit: (field: FieldLike, name: string) => void,
  depth = 0,
): void {
  if (!Array.isArray(fields) || depth >= MAX_SCHEMA_DEPTH) return

  // 이름별로 모은 뒤 2개 이상인 그룹 전체를 중복으로 본다.
  const byName = new Map<string, FieldLike[]>()
  for (const field of fields) {
    if (!field || typeof field !== "object") continue
    const name = toComparableName(field)
    if (name === null) continue
    const group = byName.get(name)
    if (group) group.push(field)
    else byName.set(name, [field])
  }

  byName.forEach((group, name) => {
    if (group.length < 2) return
    for (const field of group) visit(field, name)
  })

  for (const field of fields) {
    if (field && typeof field === "object") {
      walkDuplicates(field.fields, visit, depth + 1)
    }
  }
}

/**
 * 중복 그룹에 속한 필드들의 id 집합을 반환한다 (UI 하이라이트용).
 * id가 없는 항목은 결과에 담기지 않는다 — 서버 fieldDefs에는 id가 없을 수 있다.
 */
export function findDuplicateFieldIds(
  fields: readonly FieldLike[],
): Set<string> {
  const ids = new Set<string>()
  walkDuplicates(fields, (field) => {
    if (typeof field.id === "string") ids.add(field.id)
  })
  return ids
}

/**
 * 중복된 이름을 중복 없이 사전순으로 반환한다 (서버 에러 메시지 조립용).
 */
export function collectDuplicateFieldNames(
  fields: readonly FieldLike[],
): string[] {
  const names = new Set<string>()
  walkDuplicates(fields, (_field, name) => {
    names.add(name)
  })
  return Array.from(names).sort()
}

/**
 * 모든 레벨의 name을 trim한 새 배열을 반환한다 (원본 불변).
 *
 * 제출 직전에 한 번만 호출한다. 판정은 trim 후 비교하는데 저장은 원문으로 하면
 * "email "이 검증을 통과한 뒤 스키마 키에 공백을 남긴다.
 */
export function normalizeFieldNames(fields: FieldSchema[]): FieldSchema[] {
  return fields.map((field) => ({
    ...field,
    name: field.name.trim(),
    ...(field.fields ? { fields: normalizeFieldNames(field.fields) } : {}),
  }))
}
