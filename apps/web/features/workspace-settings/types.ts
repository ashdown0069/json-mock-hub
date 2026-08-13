// 워크스페이스 멤버 엔티티.
// api/(클라이언트·서버 프리페치)와 components/가 폴더를 넘어 함께 쓰므로 도메인 레벨에 둔다.
export interface WorkspaceMember {
  id: string
  workspace: string
  userId: string
  email: string | null
  nickname: string | null
  role: "owner" | "member"
  joinedAt: string
}
