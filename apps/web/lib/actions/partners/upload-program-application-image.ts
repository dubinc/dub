"use server";

import { getIP } from "@/lib/api/utils/get-ip";
import { prisma } from "@/lib/prisma";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";
import { actionClient } from "../safe-action";

const inputSchema = z.object({
  programSlug: z.string().trim().toLowerCase().min(1),
  ...signedUploadInputSchema.shape,
});

export const uploadProgramApplicationImageAction = actionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    const { programSlug, contentType, contentLength } = parsedInput;

    validateSignedUpload({
      contentLength,
      contentType,
      policy: "programApplicationImages",
    });

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.programImageUpload,
      identifier: await getIP(),
    });

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
      contentType,
      contentLength,
    });

    return {
      signedUrl,
      destinationUrl,
    };
  });
