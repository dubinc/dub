import { withWorkspace } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { nanoid, R2_URL } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/programs/upload-logo – get a signed URL to upload a logo for a new program
export const POST = withWorkspace(async () => {
  const key = `program-logos/${nanoid(16)}`;

  const signedUrl = await storage.getSignedUrl(key);

  return NextResponse.json({
    key,
    signedUrl,
    destinationUrl: `${R2_URL}/${key}`,
  });
});
