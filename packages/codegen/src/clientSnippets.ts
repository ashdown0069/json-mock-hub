import type { CodeGenContext, CodeLang, HttpClientLib } from "./types"
import { buildAxiosClient } from "./clients/axios"
import { buildFetchClient } from "./clients/fetch"

/**
 * HTTP 클라이언트 스니펫 디스패처.
 *
 * 구현은 clients/axios.ts·clients/fetch.ts로 나눴다 — 두 빌더는 서로 다른
 * 이유로 바뀐다(axios 인터셉터 vs fetch AbortSignal). 이 파일의 export
 * 시그니처는 공개 API이므로 유지한다(package.json의 "./clientSnippets").
 */
export function buildClientSnippet(
  ctx: CodeGenContext,
  client: HttpClientLib,
  lang: CodeLang
): string {
  return client === "axios"
    ? buildAxiosClient(ctx, lang)
    : buildFetchClient(ctx, lang)
}
