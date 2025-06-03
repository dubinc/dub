import { withWorkspace } from "@/lib/auth";
import { storage } from "@/lib/storage";
import z from "@/lib/zod";
import { nanoid, R2_URL } from "@dub/utils";
import { NextResponse } from "next/server";

const schema = z.object({
  folder: z.enum(["integration-screenshots", "program-logos"]),
});

// POST /api/workspaces/[idOrSlug]/upload-url – get a signed URL to upload a file to a workspace
export const POST = withWorkspace(async ({ req }) => {
  const { folder } = schema.parse(await req.json());

  const key = `${folder}/${nanoid(16)}`;

  const signedUrl = await storage.getSignedUrl(key);

  return NextResponse.json({
    key,
    signedUrl,
    destinationUrl: `${R2_URL}/${key}`,
  });
});
