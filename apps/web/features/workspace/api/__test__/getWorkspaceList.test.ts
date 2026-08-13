import { mapWorkspace } from "../getWorkspaceList"

describe("mapWorkspace 정규화", () => {
  const raw = {
    id: "1",
    name: "shop",
    description: "설명",
    createdAt: "2026-07-01T00:00:00.000Z",
  } as any

  it("membersCount가 없으면 0으로 채운다", () => {
    expect(mapWorkspace(raw).membersCount).toBe(0)
  })

  it("updatedAt이 없으면 createdAt으로 채운다", () => {
    expect(mapWorkspace(raw).updatedAt).toBe("2026-07-01T00:00:00.000Z")
  })

  it("이미 값이 있으면 그대로 둔다", () => {
    const full = {
      ...raw,
      membersCount: 5,
      updatedAt: "2026-07-20T00:00:00.000Z",
    } as any

    expect(mapWorkspace(full)).toMatchObject({
      membersCount: 5,
      updatedAt: "2026-07-20T00:00:00.000Z",
    })
  })
})
