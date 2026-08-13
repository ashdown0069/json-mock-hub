import { render, screen } from "@testing-library/react"
import { WorkspaceCard } from "../WorkspaceCard"

// i18n/routing의 Link는 현재 로케일을 경로에 반영한다.
// 여기서는 그 동작을 모킹해 "로케일 인식 Link를 썼는지"만 검증한다.
// next/link를 쓰고 있으면 이 모킹이 적용되지 않아 href에 접두사가 붙지 않는다.
jest.mock("next-intl", () => ({
  useFormatter: () => ({
    dateTime: (date: Date) => date.toISOString(),
  }),
}))
jest.mock("@/i18n/routing", () => ({
  Link: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={`/en${href}`} {...rest}>
      {children}
    </a>
  ),
}))

const props = {
  id: "ws1",
  name: "shop",
  description: "설명",
  membersCount: 3,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
}

describe("WorkspaceCard 로케일 인식 링크", () => {
  it("워크스페이스 링크가 로케일 접두사를 포함한다", () => {
    render(<WorkspaceCard {...props} />)

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/en/workspaces/ws1"
    )
  })

  it("카드 내용은 그대로 렌더된다", () => {
    render(<WorkspaceCard {...props} />)

    expect(screen.getByText("shop")).toBeInTheDocument()
    expect(screen.getByText("설명")).toBeInTheDocument()
  })
})
