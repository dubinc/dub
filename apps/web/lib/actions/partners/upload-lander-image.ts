"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";
import { throwIfNoPermission } from "../throw-if-no-permission";

const inputSchema = z.object({
  workspaceId: z.string(),
  ...signedUploadInputSchema.shape,
});

export const uploadLanderImageAction = authActionClient
  .inputSchema(inputSchema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { contentType, contentLength } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { key, signedUrl, destinationUrl } = await createSignedUploadUrl({
      key: `programs/${programId}/lander/image_${nanoid(10)}`,
      policy: "programLanderImages",
      contentType,
      contentLength,
    });

    return {
      key,
      signedUrl,
      destinationUrl,
    };
  });
