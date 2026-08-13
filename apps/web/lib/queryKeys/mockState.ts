export const mockStateKeys = {
  effective: (workspaceId: string, path: string) =>
    ["workspaces", workspaceId, "mockState", path] as const,
};
