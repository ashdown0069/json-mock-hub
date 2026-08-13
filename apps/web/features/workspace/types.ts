// 워크스페이스 엔티티. api/ 조회·수정 모듈과 components/가 함께 쓰는 도메인 타입이다.
export interface Workspace {
  createdAt: string
  updatedAt: string
  name: string
  description: string
  membersCount: number
  id: string
}
