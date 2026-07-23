import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import QueryProvider from "../QueryProvider";

describe("QueryProvider 컴포넌트", () => {
  it("자식 요소를 정상적으로 렌더링해야 한다", () => {
    render(
      <QueryProvider>
        <div data-testid="child">자식 요소</div>
      </QueryProvider>
    );

    expect(screen.getByTestId("child")).toBeInTheDocument();
    expect(screen.getByText("자식 요소")).toBeInTheDocument();
  });
});
