import { SetMetadata } from '@nestjs/common';

export const REQUIRE_OWNER_KEY = 'workspace:require-owner';

// 메서드 또는 클래스에 '워크스페이스 소유자(owner)만 접근 가능'을 표시한다.
// WorkspaceAccessGuard가 Reflector로 읽어 검사한다.
export const RequireOwner = () => SetMetadata(REQUIRE_OWNER_KEY, true);
