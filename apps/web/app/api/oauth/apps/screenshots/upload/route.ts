import { withWorkspace } from "@/lib/auth";
import { storage } from "@/lib/storage";
import z from "@/lib/zod";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

// TODO:
// How do we restrict this to only be called by the integration form?

const schema = z.object({
  name: z.string().min(1).max(100),
});

// POST /api/oauth/apps/signed-url – get a signed URL to upload an integration screenshot
export const GET = withWorkspace(async ({ searchParams }) => {
  const { name } = schema.parse(searchParams);

  const key = `integration-screenshots/${nanoid(7)}/${name}`;

  const signedUrl = await storage.getSignedUrl({
    key,
  });

  return NextResponse.json({ key, signedUrl });
});
