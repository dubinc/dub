"use server";

import { getIP } from "@/lib/api/utils/get-ip";
import { prisma } from "@/lib/prisma";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { ratelimit } from "@/lib/upstash";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";
import { actionClient } from "../safe-action";

const inputSchema = z.object({
  programSlug: z.string().trim().toLowerCase().min(1),
  ...signedUploadInputSchema.shape,
});

const rateLimitPolicy = RATELIMIT_POLICIES.programImageUpload;

export const uploadProgramApplicationImageAction = actionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    const { programSlug, contentType, contentLength } = parsedInput;

    const ipAddress = await getIP();

    const { success } = await ratelimit(
      rateLimitPolicy.attempts,
      rateLimitPolicy.window,
    ).limit(`${rateLimitPolicy.keyPrefix}:${ipAddress}`);

    if (!success) {
      throw new Error(
        "You've reached the maximum number of attempts to upload images for this application. Please try again later.",
      );
    }

    const program = await prisma.program.findUniqueOrThrow({
      where: {
        slug: programSlug,
      },
      select: {
        id: true,
      },
    });

    const { signedUrl, destinationUrl } = await createSignedUploadUrl({
      key: `programs/${program.id}/applications/${nanoid(10)}`,
      policy: "programApplicationImages",
      contentType,
      contentLength,
    });

    return {
      signedUrl,
      destinationUrl,
    };
  });
