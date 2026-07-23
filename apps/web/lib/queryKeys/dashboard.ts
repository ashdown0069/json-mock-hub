export const dashboardKeys = {
  all: (workspaceId: string) =>
    ["workspaces", workspaceId, "dashboard"] as const,
  stats: (workspaceId: string) =>
    [...dashboardKeys.all(workspaceId), "stats"] as const,
  logs: (workspaceId: string, page: number) =>
    [...dashboardKeys.all(workspaceId), "logs", { page }] as const,
};
