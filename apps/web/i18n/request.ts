import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // 지원하는 로케일이 아닐 경우 기본 로케일로 폴백
  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    // 타임존을 고정하지 않으면 서버(런타임 기본 타임존)와 클라이언트(브라우저 로컬 타임존)의
    // 날짜/시간 포맷 결과가 달라져 하이드레이션 에러가 발생한다.
    timeZone: 'UTC',
  };
});
