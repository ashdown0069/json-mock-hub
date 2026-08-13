import { render, screen } from "@testing-library/react"
import { FeatureBadge } from "../FeatureBadge"

describe("FeatureBadge", () => {
  it("라벨과 파라미터를 올바르게 표시한다", () => {
    render(
      <FeatureBadge variant="pagination" label="Pagination" params="page / limit" />,
    )
    expect(screen.getByText("Pagination: page / limit")).toBeInTheDocument()
  })

  it("pagination variant에 indigo 색상이 적용된다", () => {
    const { container } = render(
      <FeatureBadge variant="pagination" label="Pagination" params="page / limit" />,
    )
    const badge = container.querySelector("span")
    expect(badge?.className).toContain("bg-indigo-50")
    expect(badge?.className).toContain("text-indigo-600")
  })

  it("sort variant에 emerald 색상이 적용된다", () => {
    const { container } = render(
      <FeatureBadge variant="sort" label="Sort" params="_sort / _order" />,
    )
    const badge = container.querySelector("span")
    expect(badge?.className).toContain("bg-emerald-50")
    expect(badge?.className).toContain("text-emerald-600")
  })

  it("search variant에 amber 색상이 적용된다", () => {
    const { container } = render(
      <FeatureBadge variant="search" label="Search" params="q" />,
    )
    const badge = container.querySelector("span")
    expect(badge?.className).toContain("bg-amber-50")
    expect(badge?.className).toContain("text-amber-600")
  })
})
