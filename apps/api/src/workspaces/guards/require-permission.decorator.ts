import { SetMetadata } from '@nestjs/common';

export type WorkspacePermissionKey =
  'canCreate' | 'canRename' | 'canMove' | 'canDelete' | 'canUpdate';

export const REQUIRE_PERMISSION_KEY = 'workspace:require-permission';

// 메서드에 필요한 워크스페이스 권한 플래그를 메타데이터로 표시
// WorkspacePermissionGuard가 Reflector로 읽어 검사한다
export const RequirePermission = (permission: WorkspacePermissionKey) =>
  SetMetadata(REQUIRE_PERMISSION_KEY, permission);
