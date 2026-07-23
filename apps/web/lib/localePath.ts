// i18n/routing.ts의 localePrefix: 'as-needed' 규칙(defaultLocale ko는 접두사 생략)을
// 서버/클라이언트 어디서나 쓸 수 있는 순수 함수로 공용화한다.
export function localePath(locale: string, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`
  if (locale === "ko") return normalized
  return normalized === "/" ? `/${locale}` : `/${locale}${normalized}`
}
