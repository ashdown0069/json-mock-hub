import { createHighlighterCore, type HighlighterCore } from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

let highlighterPromise: Promise<HighlighterCore> | null = null

/**
 * Shiki 하이라이터를 싱글턴으로 초기화한다.
 * 전체 패키지 번들을 방지하기 위해 필요한 언어와 테마만 fine-grained import로 로드한다.
 */
export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      themes: [import("@shikijs/themes/github-light")],
      langs: [
        import("@shikijs/langs/json"),
        import("@shikijs/langs/javascript"),
        import("@shikijs/langs/typescript"),
        import("@shikijs/langs/shellscript"),
      ],
      // onig 대신 JS 내장 정규식 엔진을 쓰면 WASM 로딩이 없어 번들이 줄어든다
      engine: createJavaScriptRegexEngine(),
    }).catch((error) => {
      // 실패한 promise를 캐시에 남기면 새로고침 전까지 하이라이팅이 영구히 죽는다.
      // 캐시를 비워 다음 호출이 다시 시도하게 한다.
      highlighterPromise = null
      throw error
    })
  }
  return highlighterPromise
}
