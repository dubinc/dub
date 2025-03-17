export const transformWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_") ? workspaceId : `ws_${workspaceId}`;
};

export const getWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_c")
    ? workspaceId.replace("ws_", "")
    : workspaceId;
};
