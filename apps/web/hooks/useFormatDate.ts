"use client"

import { useFormatter } from "next-intl"

/**
 * ISO 날짜 문자열을 현재 로케일에 맞는 표기로 바꾸는 함수를 돌려준다.
 *
 * 로케일을 알아야 하므로 순수 함수가 아니라 훅이다 — 클라이언트 컴포넌트에서만 쓸 수 있다.
 * RequestLogTable이 쓰는 Intl 기반 표기와 방식을 통일하기 위해 next-intl의 포매터를 쓴다.
 * (직접 Intl.DateTimeFormat을 만들지 않는 이유: next-intl이 Provider의 timeZone 설정을
 *  함께 적용해주므로, 서버·클라이언트 렌더 결과가 어긋나지 않는다.)
 */
export function useFormatDate() {
  const format = useFormatter()

  return (dateString: string | null | undefined): string => {
    if (!dateString) return ""

    const date = new Date(dateString)
    // Invalid Date를 그대로 넘기면 next-intl이 RangeError를 던져 화면 전체가 죽는다
    if (Number.isNaN(date.getTime())) return ""

    return format.dateTime(date, {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }
}
