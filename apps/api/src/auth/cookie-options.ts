import { CookieOptions } from 'express';

export function authCookieOptions(): CookieOptions {
  const domain = process.env.COOKIE_DOMAIN;

  return {
    httpOnly: true,
    secure: true,
    sameSite: process.env.CROSS_SITE_COOKIES === 'true' ? 'none' : 'lax',
    path: '/',
    ...(domain ? { domain } : {}),
  };
}
