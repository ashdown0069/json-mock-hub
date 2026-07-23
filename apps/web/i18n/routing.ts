import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  locales: ['ko', 'en'],
  defaultLocale: 'ko',
  localePrefix: 'as-needed', // ko는 prefix가 없으며, en은 /en을 접두사로 사용합니다.
  localeDetection: false, // 브라우저 언어나 기존 방문 기록(쿠키)을 통해 자동으로 언어를 리다이렉트하는 기능 비활성화
});

// 클라이언트 컴포넌트에서 사용할 다국어 네비게이션 유틸리티
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
