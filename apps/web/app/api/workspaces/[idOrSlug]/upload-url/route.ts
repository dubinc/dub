import { withWorkspace } from "@/lib/auth";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const schema = signedUploadInputSchema.extend({
  folder: z.enum(["integrationScreenshots", "programLogos"]),
});

// POST /api/workspaces/[idOrSlug]/upload-url – get a signed URL to upload a file to a workspace
export const POST = withWorkspace(
  async ({ req, workspace, session }) => {
    const {
      folder: policy,
      contentType,
      contentLength,
    } = schema.parse(await req.json());

    const key =
      policy === "integrationScreenshots"
        ? `integration-screenshots/${nanoid(10)}`
        : `program-logos/${nanoid(10)}`;

    validateSignedUpload({
      contentLength,
      contentType,
      policy,
    });

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.workspaceFileUpload,
      identifier: [workspace.id, session.user.id],
    });

    const { signedUrl, destinationUrl } = await createSignedUploadUrl({
      key,
      contentType,
      contentLength,
    });

    return NextResponse.json({
      key,
      signedUrl,
      destinationUrl,
    });
  },
  {
    requiredRoles: ["owner", "member"],
  },
);
