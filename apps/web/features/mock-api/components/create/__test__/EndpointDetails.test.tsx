import { render, screen } from "@testing-library/react"
import { EndpointDetails } from "../EndpointDetails"

describe("EndpointDetails 렌더링", () => {
  it("전달된 endpointPrefix가 표시된다", () => {
    render(
      <EndpointDetails endpointPrefix="http://ws1.localhost:3000/api/shop/" />
    )
    expect(
      screen.getByText("http://ws1.localhost:3000/api/shop/")
    ).toBeInTheDocument()
  })
})
