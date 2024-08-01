import { withWorkspace } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/import/csv/upload – get a signed URL to upload a CSV file
export const GET = withWorkspace(async ({ req, workspace, session }) => {
  const id = new Date().getTime();
  const url = await storage.getSignedUrl({
    key: `workspaces/${workspace.id}/import/csv/${id}.csv`,
  });
  return NextResponse.json({ url, id });
});
