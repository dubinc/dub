import { createId } from "./create-id";

export const prefixWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_") ? workspaceId : `ws_${workspaceId}`;
};

export const normalizeWorkspaceId = (workspaceId: string) => {
  return workspaceId.startsWith("ws_c")
    ? workspaceId.replace("ws_", "")
    : workspaceId;
};

export const createWorkspaceId = () => {
  const workspaceId = createId({ prefix: "ws_" });

  // guard against collisions with old workspace ID format
  if (workspaceId.toLowerCase().startsWith("ws_c")) {
    return createWorkspaceId();
  }

  return workspaceId;
};
