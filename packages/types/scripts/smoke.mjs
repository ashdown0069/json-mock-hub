// apps/mcp(ESM)와 동일한 경로로 named import 상호운용을 검증한다.
// CJS 산출물을 ESM에서 named import 하려면 cjs-module-lexer가
// __exportStar 재export를 인식해야 한다 — 그것을 여기서 확인한다.
import assert from "node:assert/strict"

import {
  DEFAULT_MOCK_PARAMS,
  resolveMockApiParams,
  SCHEMA_PRIMITIVES,
  FIELD_TYPES,
  MAX_SCHEMA_DEPTH,
  findDuplicateFieldIds,
  collectDuplicateFieldNames,
  normalizeFieldNames,
} from "@workspace/types"

assert.equal(DEFAULT_MOCK_PARAMS.pageParam, "page")
assert.equal(typeof resolveMockApiParams, "function")
assert.equal(resolveMockApiParams({ search: true }).search.searchParam, "q")
assert.equal(SCHEMA_PRIMITIVES.length, 5)
assert.equal(FIELD_TYPES.length, 7)
assert.equal(MAX_SCHEMA_DEPTH, 8)

// CJS 산출물을 ESM에서 named import 할 때 신규 재export도 인식되는지 확인한다
assert.equal(typeof findDuplicateFieldIds, "function")
assert.equal(typeof collectDuplicateFieldNames, "function")
assert.equal(typeof normalizeFieldNames, "function")
assert.equal(findDuplicateFieldIds([{ id: "a", name: "x" }]).size, 0)

console.log("smoke(mjs): OK")
