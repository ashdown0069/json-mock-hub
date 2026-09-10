import { NextResponse, type NextRequest } from "next/server"
import createMiddleware from "next-intl/middleware"
import { routing } from "./i18n/routing"
import { REFRESH_TOKEN_COOKIE } from "./const/cookies"

const handleI18nRouting = createMiddleware(routing)

/** 로그인 없이는 의미가 없는 경로 (로케일 접두사를 뗀 기준) */
const PROTECTED_PREFIXES = ["/workspaces"]

/**
 * 경로에서 로케일 접두사를 분리한다.
 * localePrefix: 'always'이므로 정상 요청에는 항상 접두사가 있다.
 * 접두사가 없는 구 URL은 next-intl 미들웨어가 기본 로케일로 리다이렉트하지만,
 * 그 전에 인증 가드가 먼저 돌기 때문에 여기서도 기본 로케일로 폴백해 둔다.
 */
function splitLocale(pathname: string): { locale: string; rest: string } {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return { locale, rest: "/" }
    if (pathname.startsWith(`/${locale}/`)) {
      return { locale, rest: pathname.slice(locale.length + 1) }
    }
  }
  return { locale: routing.defaultLocale, rest: pathname }
}

export async function middleware(request: NextRequest) {
  const { locale, rest } = splitLocale(request.nextUrl.pathname)

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => rest === prefix || rest.startsWith(`${prefix}/`)
  )

  // 토큰을 검증하지는 않는다
  // 실제 인가는 API가 수행한다. 여기서는 로그인하지 않은 사용자가 빈 대시보드를
  // 본 뒤 클라이언트에서 튕기는 깜빡임만 없앤다.
  if (isProtected && !request.cookies.get(REFRESH_TOKEN_COOKIE)) {
    const url = request.nextUrl.clone()
    url.pathname = `/${locale}`
    url.search = ""
    return NextResponse.redirect(url)
  }

  return handleI18nRouting(request)
}

export const config = {
  matcher: [
    /*
     * 아래를 제외한 모든 경로에서 동작한다:
     * - api           (API 라우트)
     * - _next, _vercel (프레임워크 내부 경로)
     * - 확장자가 있는 요청 (robots.txt, favicon.ico, sitemap.xml, 이미지 등)
     *
     * 확장자 제외가 중요하다. localePrefix: 'always'에서는 /robots.txt가
     * /ko/robots.txt로 리다이렉트되어 404가 나기 때문이다.
     */
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
}
