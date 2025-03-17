import { createId } from "./create-id";

export const transformWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_") ? workspaceId : `ws_${workspaceId}`;
};

export const getWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_c")
    ? workspaceId.replace("ws_", "")
    : workspaceId;
};

export const createWorkspaceId = () => {
  const workspaceId = createId({ prefix: "ws_" });

  if (workspaceId.startsWith("ws_c")) {
    return createWorkspaceId();
  }

  return workspaceId;
};
