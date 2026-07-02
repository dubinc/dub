import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { cancelSubscription } from "@/lib/stripe/cancel-subscription";
import { R2_URL } from "@dub/utils";
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
      stripeId: true,
      logo: true,
    },
  });

  if (!workspace) {
    return logAndRespond(`Workspace ${workspaceId} not found. Skipping...`);
  }

  // Cancel the workspace's Stripe subscription if exists
  if (workspace.stripeId) {
    await cancelSubscription(workspace.stripeId);
  }

  // Delete workspace logo if it's a custom logo stored in R2
  try {
    if (
      workspace.logo &&
      workspace.logo.startsWith(`${R2_URL}/logos/${workspace.id}`)
    ) {
      await storage.delete({ key: workspace.logo.replace(`${R2_URL}/`, "") });
    }
  } catch (error) {
    console.error(
      `Failed to delete logo for workspace ${workspace.id}. Continuing deletion.`,
      error,
    );
  }

  await prisma.project.delete({
    where: {
      id: workspaceId,
    },
  });

  return logAndRespond(`Workspace ${workspaceId} deleted successfully.`);
}
