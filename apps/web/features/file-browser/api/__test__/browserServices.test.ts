jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}))

import { axiosInstance } from "@/lib/axios";
import { getBrowserItems } from "../getBrowserItems";
import { createBrowserItem } from "../createBrowserItem";
import { renameBrowserItem } from "../renameBrowserItem";
import { moveBrowserItems } from "../moveBrowserItems";
import { deleteBrowserItems } from "../deleteBrowserItems";
import { updateBrowserItem } from "../updateBrowserItem";

jest.mock("@/lib/axios", () => ({
  axiosInstance: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    put: jest.fn(),
  },
}));

const mockedAxiosInstance = axiosInstance as jest.Mocked<typeof axiosInstance>;

describe("FileBrowser 개별 서비스 API 호출 테스트", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("getBrowserItems 함수는 파일 목록 조회 요청을 서버로 정상 전송하고 결과를 반환해야 한다", async () => {
    const mockData = [{ id: "1", name: "Users", itemType: "Folder", parentId: null }];
    mockedAxiosInstance.get.mockResolvedValueOnce({ data: mockData });

    const result = await getBrowserItems("ws-test");
    expect(result).toEqual(mockData);
    expect(mockedAxiosInstance.get).toHaveBeenCalledWith("/ws-test/filebrowser/getItems");
  });

  it("createBrowserItem 함수는 parentId가 포함된 생성 요청을 서버로 정상 전송하고 결과를 반환해야 한다", async () => {
    const payload = { name: "New API", itemType: "File" as const, parentId: "1" };
    const mockResponse = { id: "2", ...payload };
    mockedAxiosInstance.post.mockResolvedValueOnce({ data: mockResponse });

    const result = await createBrowserItem("ws-test", payload);
    expect(result).toEqual(mockResponse);
    expect(mockedAxiosInstance.post).toHaveBeenCalledWith("/ws-test/filebrowser/createItem", payload);
  });

  it("renameBrowserItem 함수는 이름 변경 요청을 서버로 정상 전송해야 한다", async () => {
    const payload = { itemId: "1", newName: "UsersUpdated" };
    const mockResponse = { id: "1", name: "UsersUpdated", itemType: "Folder", parentId: null };
    mockedAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse });

    const result = await renameBrowserItem("ws-test", payload);
    expect(result).toEqual(mockResponse);
    expect(mockedAxiosInstance.patch).toHaveBeenCalledWith("/ws-test/filebrowser/renameItem", {
      itemId: "1",
      newName: "UsersUpdated",
    });
  });

  it("moveBrowserItems 함수는 아이템 이동 요청을 서버로 정상 전송해야 한다", async () => {
    const payload = { dragIds: ["2"], parentId: "1" };
    const mockResponse = [{ id: "2", name: "New API", itemType: "File", parentId: "1" }];
    mockedAxiosInstance.patch.mockResolvedValueOnce({ data: mockResponse });

    const result = await moveBrowserItems("ws-test", payload);
    expect(result).toEqual(mockResponse);
    expect(mockedAxiosInstance.patch).toHaveBeenCalledWith("/ws-test/filebrowser/moveItems", {
      dragIds: ["2"],
      parentId: "1",
    });
  });

  it("deleteBrowserItems 함수는 삭제할 아이템 ID 배열을 HTTP Body에 실어서 서버로 전송해야 한다", async () => {
    mockedAxiosInstance.delete.mockResolvedValueOnce({ data: {} });

    await deleteBrowserItems("ws-test", ["1", "2"]);
    expect(mockedAxiosInstance.delete).toHaveBeenCalledWith("/ws-test/filebrowser", {
      data: { itemIds: ["1", "2"] },
    });
  });

  it("updateBrowserItem 함수는 아이템 세부 속성 수정 요청을 서버로 정상 전송해야 한다", async () => {
    const payload = { itemId: "1", name: "UpdatedName", itemType: "File" as const, parentId: null };
    const mockResponse = { id: "1", name: "UpdatedName", itemType: "File", parentId: null };
    mockedAxiosInstance.put.mockResolvedValueOnce({ data: mockResponse });

    const result = await updateBrowserItem("ws-test", payload);
    expect(result).toEqual(mockResponse);
    expect(mockedAxiosInstance.put).toHaveBeenCalledWith("/ws-test/filebrowser", payload);
  });
});

