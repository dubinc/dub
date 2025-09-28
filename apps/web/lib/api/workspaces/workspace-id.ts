export const prefixWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_") ? workspaceId : `ws_${workspaceId}`;
};

export const normalizeWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_c")
    ? workspaceId.replace("ws_", "")
    : workspaceId;
};
