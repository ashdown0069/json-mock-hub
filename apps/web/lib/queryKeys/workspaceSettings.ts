export const workspaceSettingsKeys = {
  all: (workspaceId: string) => ["workspace", workspaceId] as const,
  roles: (workspaceId: string) =>
    [...workspaceSettingsKeys.all(workspaceId), "roles"] as const,
  members: (workspaceId: string) =>
    [...workspaceSettingsKeys.all(workspaceId), "members"] as const,
  apiKey: (workspaceId: string) =>
    [...workspaceSettingsKeys.all(workspaceId), "api-key"] as const,
  membership: (workspaceId: string) =>
    [...workspaceSettingsKeys.all(workspaceId), "membership"] as const,
}
