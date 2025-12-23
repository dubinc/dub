import { withCron } from "@/lib/cron/with-cron";
import { logAndRespond } from "../../utils";
import { deleteWorkspace } from "./delete-workspace";
import { deleteWorkspaceCustomersBatch } from "./delete-workspace-customers";
import { deleteWorkspaceDomainsBatch } from "./delete-workspace-domains";
import { deleteWorkspaceFoldersBatch } from "./delete-workspace-folders";
import { deleteWorkspaceLinksBatch } from "./delete-workspace-links";
import { deleteWorkspaceSchema } from "./utils";

export const dynamic = "force-dynamic";

// POST /api/cron/workspaces/delete
export const POST = withCron(async ({ rawBody }) => {
  const payload = deleteWorkspaceSchema.parse(JSON.parse(rawBody));

  switch (payload.step) {
    case "delete-links":
      await deleteWorkspaceLinksBatch(payload);
      break;
    case "delete-domains":
      await deleteWorkspaceDomainsBatch(payload);
      break;
    case "delete-folders":
      await deleteWorkspaceFoldersBatch(payload);
      break;
    case "delete-customers":
      await deleteWorkspaceCustomersBatch(payload);
      break;
    case "delete-workspace":
      await deleteWorkspace(payload);
      break;
    default:
      throw new Error(`Unknown step ${payload.step}`);
  }

  return logAndRespond(
    `Workspace ${payload.workspaceId} deleted successfully.`,
  );
});
