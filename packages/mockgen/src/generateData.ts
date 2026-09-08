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
 * 엉뚱한 값이 나올 수 있다. fields 저장 경로 및 런타임 입력의 잠재적 오염을
 * 방지하기 위해 라이브러리 차원에서 허용 목록으로 엄격하게 제한한다.
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

/**
 * 주어진 로케일에 맞춘 객체 생성기 팩토리.
 * generateDummyData(컬렉션)와 generateSingleObjectData(단일 객체)가 동일한 생성 규칙을 공유한다.
 */
function createObjectGenerator(locale: string) {
  const faker = locale === "ko" ? fakerKO : fakerEN

  // 타입별 원시값 생성을 한 곳으로 모아 스칼라 필드와 스칼라 배열 원소가 동일 규칙을 쓰게 한다 (DRY).
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

  return { generateObject }
}

/**
 * 컬렉션(배열) 형태의 더미 데이터를 생성한다.
 * 최상위 id는 1부터 순차 증가하는 번호로 주입된다.
 */
export const generateDummyData = (
  fields: FieldSchema[],
  count: number,
  locale: string
) => {
  const { generateObject } = createObjectGenerator(locale)

  // 최상위 id는 예약 필드: 사용자 정의를 무시하고 항상 1부터 순차 증가시킨다
  const topLevelFields = fields.filter((f) => f.name.trim() !== "id")
  return Array.from({ length: count }).map((_, index) => ({
    id: index + 1,
    ...generateObject(topLevelFields),
  }))
}

/**
 * 단일 객체(Singleton/Object) 형태의 목데이터를 생성한다.
 * 최상위 id를 강제로 주입하지 않으며, 사용자가 정의한 id 필드가 있다면 정의된 규칙대로 생성·보존된다.
 */
export const generateSingleObjectData = (
  fields: FieldSchema[],
  locale: string
): Record<string, unknown> => {
  const { generateObject } = createObjectGenerator(locale)
  return generateObject(fields)
}

