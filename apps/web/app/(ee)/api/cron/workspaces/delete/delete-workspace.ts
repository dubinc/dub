import { prisma } from "@dub/prisma";
import { logAndRespond } from "../../utils";
import { DeleteWorkspacePayload } from "./utils";

export async function deleteWorkspace(payload: DeleteWorkspacePayload) {
  const { workspaceId } = payload;

  // Delete invoices
  const deletedInvoices = await prisma.invoice.deleteMany({
    where: {
      workspaceId,
    },
  });

  if (deletedInvoices.count > 0) {
    console.log(
      `Deleted ${deletedInvoices.count} invoices for workspace ${workspaceId}.`,
    );
  }

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
