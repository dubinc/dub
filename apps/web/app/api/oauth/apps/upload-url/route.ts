import { withWorkspace } from "@/lib/auth";
import { storage } from "@/lib/storage";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// POST /api/oauth/apps/upload-url – get a signed URL to upload an integration screenshot
export const POST = withWorkspace(async () => {
  const key = `integration-screenshots/${nanoid(16)}`;

  const signedUrl = await storage.getSignedUrl(key);
  console.log({ key, signedUrl });

  return NextResponse.json({ key, signedUrl });
});
