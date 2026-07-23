import { createHighlighterCore, type HighlighterCore } from "shiki/core"
import { createJavaScriptRegexEngine } from "shiki/engine/javascript"

// 싱글턴 인스턴스를 유지하기 위한 변수입니다.
let highlighterPromise: Promise<HighlighterCore> | null = null

/**
 * Shiki 코드 하이라이터를 싱글턴 형식으로 동적 초기화하여 반환합니다.
 * 전체 패키지 번들을 방지하고 필요한 언어(JSON, JS)와 테마만 fine-grained 번들 방식으로 로드합니다.
 */
export function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      // github-light 테마를 동적으로 가져옵니다.
      themes: [import("@shikijs/themes/github-light")],
      // JSON, JS, TS 구문 분석을 위한 언어 팩을 동적으로 가져옵니다.
      langs: [
        import("@shikijs/langs/json"),
        import("@shikijs/langs/javascript"),
        import("@shikijs/langs/typescript"),
      ],
      // 정규식 엔진으로 자바스크립트 내장 엔진을 사용해 번들 크기를 줄입니다.
      engine: createJavaScriptRegexEngine(),
    })
  }
  return highlighterPromise
}
