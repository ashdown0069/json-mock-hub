import type { SchemaPrimitive } from "@workspace/types"

// 타입별로 선택 가능한 faker 모듈/메서드 카탈로그 (SchemaEditor 셀렉트 옵션 데이터).
//
// 선언 타입과 실제 반환값이 일치해야 한다 — 어긋나면 생성된 검증 스키마가
// 자기 목데이터를 거부한다(예: number + commerce.price → 실제 "745.69" vs z.number()).
//
// 소비처(SchemaEditor, schema-input)가 object/array를 포함한 FieldType으로도 조회하므로
// 선언은 Record<string, ...>로 넓게 두고, satisfies로 SchemaPrimitive 키 누락만 막는다.
export const FAKER_BY_TYPE: Record<string, Record<string, string[]>> = {
  string: {
    person: [
      "fullName",
      "firstName",
      "lastName",
      "jobTitle",
      "prefix",
      "suffix",
      "sex",
      "gender",
    ],
    internet: ["email", "password", "username", "url", "ipv4", "ipv6", "mac"],
    location: ["city", "country", "streetAddress", "zipCode", "timeZone"],
    lorem: [
      "word",
      "words",
      "sentence",
      "sentences",
      "paragraph",
      "paragraphs",
      "text",
    ],
    phone: ["number", "imei"],
    finance: [
      "accountNumber",
      "currencyCode",
      "creditCardNumber",
      "bitcoinAddress",
      // 실제 반환값이 문자열("878.31")이라 number 그룹에서 옮겨왔다
      "amount",
    ],
    // price도 문자열("745.69")을 반환한다
    commerce: ["productName", "department", "productDescription", "price"],
    company: ["name", "catchPhrase", "buzzPhrase"],
    system: ["fileName", "fileExt", "mimeType", "semver", "networkInterface"],
    vehicle: ["vehicle", "manufacturer", "model", "vrm", "vin"],
    animal: ["dog", "cat", "snake", "bear", "lion", "bird"],
    // hsl은 배열([113, 0.84, 0.15])을 반환하므로 제외한다
    color: ["human", "rgb", "space"],
    word: [
      "adjective",
      "adverb",
      "conjunction",
      "interjection",
      "noun",
      "preposition",
      "verb",
    ],
    string: [
      "alpha",
      "alphanumeric",
      "binary",
      "hexadecimal",
      "numeric",
      "sample",
    ],
    // number.binary/octal/hex는 "0"·"6"·"d" 같은 문자열을 반환한다
    number: ["binary", "octal", "hex"],
  },
  number: {
    location: ["latitude", "longitude"],
    number: ["int", "float"],
  },
  boolean: {
    datatype: ["boolean"],
  },
  // date 계열은 Date 인스턴스를 반환한다 — generateData가 ISO 문자열로 정규화한다
  date: {
    date: ["past", "future", "recent", "soon", "anytime", "birthdate"],
  },
  uuid: {
    string: ["uuid"],
  },
} satisfies Record<SchemaPrimitive, Record<string, string[]>>

/**
 * 타입별 허용 목록을 "module.method" 문자열 Set으로 미리 평탄화해 둔다.
 *
 * 소비처가 3곳(generateData, mcp schema-input, web 스토어)이고 매 호출마다
 * 평탄화하면 낭비다. 카탈로그는 모듈 로드 후 불변이라 안전하게 캐시할 수 있다.
 */
const FLATTENED_BY_TYPE: ReadonlyMap<string, ReadonlySet<string>> = new Map(
  Object.entries(FAKER_BY_TYPE).map(([type, catalog]) => [
    type,
    new Set(
      Object.entries(catalog).flatMap(([module, methods]) =>
        methods.map((method) => `${module}.${method}`)
      )
    ),
  ])
)

/**
 * 해당 필드 타입에 쓸 수 있는 "module.method" 목록.
 * 카탈로그에 없는 타입(object/array)은 빈 배열 — 호출부가 "사용 가능: (없음)"을
 * 만들 수 있도록 빈 객체가 아니라 빈 배열로 통일한다.
 */
export function fakerMethodsForType(type: string): string[] {
  const methods = FLATTENED_BY_TYPE.get(type)
  return methods ? [...methods] : []
}

/**
 * 타입과 메서드 조합이 유효한지 판정한다.
 *
 * 전역 허용 목록이 아니라 타입별로 좁히는 이유: commerce.price는 "745.69" 문자열을
 * 반환해 string 그룹에 있는데, 전역으로 검사하면 type: "number" 필드에 걸린 조합이
 * 그대로 통과해 생성된 z.number()가 자기 목데이터를 거부한다.
 */
export function isFakerMethodAllowed(type: string, dotPath: string): boolean {
  return FLATTENED_BY_TYPE.get(type)?.has(dotPath) ?? false
}
