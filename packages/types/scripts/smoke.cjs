// apps/api 런타임(순수 Node · CommonJS)과 동일한 경로로 패키지를 로드한다.
// package.json에 exports 필드가 있으므로 self-reference(@workspace/types)가 동작한다.
const assert = require("node:assert/strict")

const {
  DEFAULT_MOCK_PARAMS,
  resolveMockApiParams,
  SCHEMA_PRIMITIVES,
  FIELD_TYPES,
  MAX_SCHEMA_DEPTH,
  findDuplicateFieldIds,
  collectDuplicateFieldNames,
  normalizeFieldNames,
} = require("@workspace/types")

// 런타임 값이 실제로 넘어오는지 (타입만 넘어오면 undefined가 된다)
assert.equal(DEFAULT_MOCK_PARAMS.pageParam, "page")
assert.equal(DEFAULT_MOCK_PARAMS.limitParam, "limit")
assert.equal(DEFAULT_MOCK_PARAMS.searchParam, "q")

// 함수 export가 호출 가능한지
assert.equal(typeof resolveMockApiParams, "function")
assert.equal(resolveMockApiParams(null).pagination, null)
assert.equal(resolveMockApiParams(null).resourceType, "collection")
assert.equal(
  resolveMockApiParams({ pagination: true }).pagination.pageParam,
  "page",
)
assert.equal(
  resolveMockApiParams({ pagination: true }).resourceType,
  "collection",
)
assert.equal(
  resolveMockApiParams({ resourceType: "object", pagination: true }).resourceType,
  "object",
)
assert.equal(
  resolveMockApiParams({ resourceType: "object", pagination: true }).pagination,
  null,
)

// 배럴(index)이 두 소스 파일을 모두 재export하는지
assert.equal(SCHEMA_PRIMITIVES.length, 5)
assert.equal(FIELD_TYPES.length, 7)
assert.equal(MAX_SCHEMA_DEPTH, 8)

// fieldValidation의 런타임 함수가 dist 배럴로 실제로 넘어오는지.
// apps/api가 이 경로(순수 Node · CJS)로 로드하므로 여기서만 잡을 수 있다.
assert.equal(typeof findDuplicateFieldIds, "function")
assert.equal(typeof collectDuplicateFieldNames, "function")
assert.equal(typeof normalizeFieldNames, "function")
assert.deepEqual(
  collectDuplicateFieldNames([{ name: "email" }, { name: "email" }]),
  ["email"],
)

console.log("smoke(cjs): OK")
