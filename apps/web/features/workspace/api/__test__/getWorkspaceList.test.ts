import { axiosInstance } from "@/lib/axios";
import { QueryClient } from "@tanstack/react-query";
import { getWorkspaceList } from "../getWorkspaceList";
import { prefetchWorkspaceList } from "../getWorkspaceList.server";

jest.mock("@/lib/axios", () => ({
  axiosInstance: {
    get: jest.fn(),
  },
}));
const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>;

describe("getWorkspaceList 서비스", () => {
  it("MockAPI 응답 데이터를 UI용 WorkSpaceInfoProps 스펙에 맞게 매핑하여 반환해야 한다", async () => {
    const mockApiResponse = [
      {
        id: "1",
        name: "smith, Barrows and Wisozk",
        description: "description 1",
        password: "password 1",
        owner: "owner 1",
        membersCount: 76,
        isDeleted: false,
        createdAt: "2026-06-30T08:18:07.009Z",
      },
    ];

    mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockApiResponse });

    const result = await getWorkspaceList();

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: "1",
      name: "smith, Barrows and Wisozk",
      description: "description 1",
      membersCount: 76,
      createdAt: "2026-06-30T08:18:07.009Z",
      updatedAt: "2026-06-30T08:18:07.009Z",
    });
  });

  it("prefetchWorkspaceList 함수가 존재하고 정상적으로 호출되어야 한다", async () => {
    const queryClient = new QueryClient();
    const prefetchSpy = jest.spyOn(queryClient, "prefetchQuery").mockResolvedValueOnce(undefined);

    await prefetchWorkspaceList(queryClient);

    expect(prefetchSpy).toHaveBeenCalledWith({
      queryKey: ["workspaces", "list"],
      queryFn: expect.any(Function),
    });

    prefetchSpy.mockRestore();
  });
});
