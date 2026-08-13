/**
 * 워크스페이스 역할이 갖는 CRUD 권한 5종의 단일 진실 원천.
 *
 * 이전에는 이 5개가 세 곳(서버 응답 WorkspaceRoleData, 조합 훅 MyPermissions,
 * 트리 컨텍스트 TreePermissions)에 각각 손으로 나열돼 있었다 — 권한을 하나
 * 추가할 때 어느 하나를 빠뜨려도 컴파일과 테스트가 모두 통과하고, "서버는
 * 내려주는데 UI가 조용히 무시"하는 상태가 됐다.
 *
 * 여기서 파생시키면 필드 추가가 곧 소비처의 컴파일 에러가 된다.
 * apps/api의 RoleService.updateRole도 같은 방식으로 스키마에서 파생시킨다
 * (Partial<Pick<WorkspaceRole, ...>>) — 웹을 그 관행에 맞춘 것이다.
 */
export interface TreePermissions {
  canCreate: boolean
  canRename: boolean
  canMove: boolean
  canDelete: boolean
  canUpdate: boolean
}
