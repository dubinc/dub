import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";
import { DeleteWorkspacePayload } from "./utils";

export async function deleteWorkspace(payload: DeleteWorkspacePayload) {
  const { workspaceId } = payload;

  const workspace = await prisma.project.findUnique({
    where: {
      id: workspaceId,
    },
    select: {
      id: true,
    },
  });

  if (!workspace) {
    return logAndRespond(`Workspace ${workspaceId} not found. Skipping...`);
  }

  await prisma.project.delete({
    where: {
      id: workspaceId,
    },
  });

  return logAndRespond(`Workspace ${workspaceId} deleted successfully.`);
}
