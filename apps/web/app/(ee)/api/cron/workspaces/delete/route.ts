import { withCron } from "@/lib/cron/with-cron";
import { logAndRespond } from "../../utils";
import { deleteWorkspace } from "./delete-workspace";
import { deleteWorkspaceCustomers } from "./delete-workspace-customers";
import { deleteWorkspaceDomains } from "./delete-workspace-domains";
import { deleteWorkspaceFolders } from "./delete-workspace-folders";
import { deleteWorkspaceLinks } from "./delete-workspace-links";
import { deleteWorkspaceSchema } from "./utils";

export const dynamic = "force-dynamic";

// POST /api/cron/workspaces/delete
export const POST = withCron(async ({ rawBody }) => {
  const payload = deleteWorkspaceSchema.parse(JSON.parse(rawBody));

  switch (payload.step) {
    case "delete-links":
      return await deleteWorkspaceLinks(payload);
    case "delete-domains":
      return await deleteWorkspaceDomains(payload);
    case "delete-folders":
      return await deleteWorkspaceFolders(payload);
    case "delete-customers":
      return await deleteWorkspaceCustomers(payload);
    case "delete-workspace":
      return await deleteWorkspace(payload);
    default:
      return logAndRespond(`Unknown step ${payload.step}`);
  }
});
