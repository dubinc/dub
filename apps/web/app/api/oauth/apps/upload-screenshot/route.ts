import { withWorkspace } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/oauth/apps/upload-screenshot – get a signed URL to upload an integration screenshot
export const GET = withWorkspace(async () => {
  // TODO:
  // How do we restrict this to only be called by the integration form?
  // Should we move to more generic endpoint `/api/storage/signed-url`?

  const key = `integration-screenshots/${nanoid(7)}`;

  const signedUrl = await storage.getSignedUrl({
    key,
  });

  return NextResponse.json({ key, signedUrl });
});
