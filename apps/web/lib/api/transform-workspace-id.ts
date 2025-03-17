export const transformWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_") ? workspaceId : `ws_${workspaceId}`;
};
