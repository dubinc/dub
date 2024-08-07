import { withWorkspace } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/import/csv/upload-url – get a signed URL to upload a CSV file
export const POST = withWorkspace(async () => {
  const id = nanoid(16);

  const signedUrl = await storage.getSignedUrl(`csv-uploads/${id}.csv`);

  return NextResponse.json({ id, signedUrl });
});
