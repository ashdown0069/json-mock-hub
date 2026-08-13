/**
 * 라우트가 초기 로드에 내려받는 JS 총량을 잰다.
 *
 * next build가 출력하는 "First Load JS"는 반올림된 요약이라 어떤 청크가 무엇을
 * 담고 있는지 알 수 없고, 레이아웃 단위 수치는 아예 나오지 않는다. 이 스크립트는
 * app-build-manifest.json이 라우트별로 나열한 청크를 실제로 읽어 합산한다.
 *
 * 사용법:
 *   node scripts/measure-route-bundle.mjs                 # 전체 라우트 합계
 *   node scripts/measure-route-bundle.mjs "(explorer)"    # 일치 라우트 + 청크 상세
 */
import { readFileSync, existsSync } from "node:fs"
import { gzipSync } from "node:zlib"
import { join } from "node:path"
// web의 ESLint 설정은 브라우저 전역을 가정하므로 process를 명시적으로 들여온다
import process from "node:process"

const NEXT_DIR = ".next"
const MANIFEST = join(NEXT_DIR, "app-build-manifest.json")

if (!existsSync(MANIFEST)) {
  console.error(`${MANIFEST} 가 없다. 먼저 'npx next build' 를 실행할 것.`)
  process.exit(1)
}

const pages = JSON.parse(readFileSync(MANIFEST, "utf8")).pages
const filter = process.argv[2]
const kb = (n) => `${Math.round(n / 1024)}KB`

function measure(files) {
  let raw = 0
  let gzip = 0
  const rows = []
  for (const file of files) {
    if (!file.endsWith(".js")) continue
    const path = join(NEXT_DIR, file)
    if (!existsSync(path)) continue
    const buf = readFileSync(path)
    const gz = gzipSync(buf).length
    raw += buf.length
    gzip += gz
    rows.push({ name: file.split("/").pop(), raw: buf.length, gzip: gz })
  }
  rows.sort((a, b) => b.gzip - a.gzip)
  return { raw, gzip, rows }
}

const routes = Object.keys(pages).filter((r) => !filter || r.includes(filter))

if (routes.length === 0) {
  console.error(`"${filter}" 와 일치하는 라우트가 없다.`)
  process.exit(1)
}

for (const route of routes) {
  const { raw, gzip, rows } = measure(pages[route])
  console.log(`\n${route}`)
  console.log(`  합계: ${kb(raw)} raw / ${kb(gzip)} gzip  (청크 ${rows.length}개)`)
  if (filter) {
    for (const row of rows.slice(0, 8)) {
      console.log(
        `    ${kb(row.raw).padStart(6)} / ${kb(row.gzip).padStart(6)} gz  ${row.name}`,
      )
    }
  }
}
