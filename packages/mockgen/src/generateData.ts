// 루트 배럴(@faker-js/faker)은 무엇이 번들에 들어올지가 번들러의 트리셰이킹
// 판단에 달려 있다. 서브패스를 쓰면 ko·en 두 로케일만 쓴다는 계약이 코드에
// 드러나고, 나중에 번들러 동작이 바뀌어도 조용히 커지지 않는다.
import { faker as fakerKO } from "@faker-js/faker/locale/ko"
import { faker as fakerEN } from "@faker-js/faker/locale/en"
import {
  FieldSchema,
  SchemaPrimitive,
  MAX_SCHEMA_DEPTH,
} from "@workspace/types"
import { isFakerMethodAllowed } from "./fakerMethods"

/** 배열 필드가 만드는 원소 수. 깊이 d에서 리프가 n × 3^d로 폭발하므로 상한과 함께 관리한다. */
const ARRAY_ITEM_COUNT = 3

/**
 * "module.method" 문자열로 faker를 호출한다.
 *
 * 옵셔널 체이닝(?.())은 null/undefined만 단락시키므로 "constructor.name"이나
 * "__proto__.toString"처럼 존재하지만 의도치 않은 프로퍼티에서 TypeError나
 * 엉뚱한 값이 나왔다. fieldDefs 저장 경로는 @IsArray()만 걸려 무검증이므로
 * 라이브러리에서 허용 목록으로 막는다.
 *
 * date 계열은 Date 인스턴스를 돌려주므로 JSON 저장을 위해 ISO 문자열로 정규화한다.
 * 쓸 수 없는 조합이면 undefined를 반환해, 호출부가 필드 타입에 맞는 기본값으로 폴백하게 한다.
 */
function callFakerMethod(
  faker: unknown,
  dotPath: string,
  fieldType: string
): unknown | undefined {
  if (!isFakerMethodAllowed(fieldType, dotPath)) return undefined

  const [moduleName, methodName] = dotPath.split(".")
  if (!moduleName || !methodName) return undefined

  const module = (faker as Record<string, unknown>)[moduleName]
  if (typeof module !== "object" || module === null) return undefined

  const method = (module as Record<string, unknown>)[methodName]
  if (typeof method !== "function") return undefined

  const raw = (method as (...args: unknown[]) => unknown).call(module)
  if (raw === null || raw === undefined) return undefined
  if (typeof raw === "number" && !Number.isFinite(raw)) return undefined
  return raw instanceof Date ? raw.toISOString() : raw
}

export const generateDummyData = (
  fields: FieldSchema[],
  count: number,
  locale: string
) => {
  const faker = locale === "ko" ? fakerKO : fakerEN

  // 타입별 원시값 생성을 한 곳으로 모아 스칼라 필드와 스칼라 배열 원소가 동일 규칙을 쓰게 한다 (DRY).
  // 레코드 + satisfies로 두면 SchemaPrimitive에 값이 추가될 때 컴파일 에러가 난다 —
  // switch의 default: return ""는 모든 행을 빈 문자열로 만들면서도 조용히 통과했다.
  const PRIMITIVE_GENERATORS = {
    string: () => faker.lorem.words(),
    number: () => faker.number.int({ min: 1, max: 1000 }),
    boolean: () => faker.datatype.boolean(),
    date: () => faker.date.recent().toISOString(),
    uuid: () => faker.string.uuid(),
  } satisfies Record<SchemaPrimitive, () => unknown>

  const generatePrimitive = (type: string): unknown => {
    const generator = (
      PRIMITIVE_GENERATORS as Record<string, (() => unknown) | undefined>
    )[type]
    // 목록 밖 타입에 ""를 주면 "유효한 빈 문자열"과 구분되지 않는다.
    // null은 JSON에 그대로 담기고 zod/yup 검증에서 즉시 드러난다.
    return generator ? generator() : null
  }

  const generateObject = (
    schemaFields: FieldSchema[],
    depth = 0
  ): Record<string, unknown> => {
    // 필드명 __proto__가 프로토타입을 오염시키지 않도록 프로토타입 없는 객체를 쓴다
    const obj: Record<string, unknown> = Object.create(null)

    for (const field of schemaFields) {
      if (!field.name) continue

      if (field.fakerMethod && field.fakerMethod !== "none") {
        // 타입에 맞지 않는 조합(예: number + commerce.price)은 무시하고
        // 선언된 타입에 맞는 값을 만든다 — 그래야 생성된 검증 스키마가 통과한다
        const value = callFakerMethod(faker, field.fakerMethod, field.type)
        obj[field.name] =
          value === undefined ? generatePrimitive(field.type) : value
        continue
      }

      if (field.type === "object") {
        obj[field.name] =
          field.fields && depth + 1 < MAX_SCHEMA_DEPTH
            ? generateObject(field.fields, depth + 1)
            : {}
      } else if (field.type === "array") {
        // 상한을 넘으면 전개를 멈춰 리프 수가 3^d로 폭발하는 것을 막는다
        obj[field.name] =
          depth + 1 >= MAX_SCHEMA_DEPTH
            ? []
            : Array.from({ length: ARRAY_ITEM_COUNT }).map(() =>
                field.fields
                  ? generateObject(field.fields, depth + 1)
                  : generatePrimitive(field.arrayItemType ?? "string")
              )
      } else {
        obj[field.name] = generatePrimitive(field.type)
      }
    }

    // JSON 직렬화·전개 연산을 위해 일반 객체로 되돌린다
    return { ...obj }
  }

  // 최상위 id는 예약 필드: 사용자 정의를 무시하고 항상 1부터 순차 증가시킨다
  const topLevelFields = fields.filter((f) => f.name.trim() !== "id")
  return Array.from({ length: count }).map((_, index) => ({
    id: index + 1,
    ...generateObject(topLevelFields),
  }))
}
