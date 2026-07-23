import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** 인증된 요청에서 사용자 id(payload.sub)를 추출한다.
 * JwtStrategy.validate / JwtOrApiKeyGuard가 req.user.sub를 설정한다. */
export const currentUserIdFactory = (
  _data: unknown,
  ctx: ExecutionContext,
): string => {
  const request = ctx.switchToHttp().getRequest<{ user?: { sub?: string } }>();
  return request.user?.sub as string;
};

export const CurrentUserId = createParamDecorator(currentUserIdFactory);
