import { axiosInstance } from "@/lib/axios";
import { createWorkspace } from "../createWorkspace";

jest.mock("@/lib/axios", () => ({
  axiosInstance: {
    post: jest.fn(),
  },
}));
const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>;

describe("createWorkspace 서비스", () => {
  it("createWorkspace 함수는 공통 Envelope 규격에 맞춰 응답받고 요청을 정상 수행해야 한다", async () => {
    const mockRequest = {
      name: "smith, Barrows and Wisozk",
      description: "description 1",
      password: "password 1",
      passwordConfirm: "password 1",
    };

    const mockResponse = {
      success: true,
      message: "",
      data: {
        id: "11",
        createdAt: "2026-07-01T05:40:00.000Z",
        ...mockRequest,
      },
    };

    mockedAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await createWorkspace(mockRequest);

    expect(mockedAxiosInstance.post).toHaveBeenCalledWith(
      "/workspaces",
      mockRequest
    );
    expect(result.success).toBe(true);
    expect(result.data.id).toBe("11");
  });
});
