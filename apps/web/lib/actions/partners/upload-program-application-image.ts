"use server";

import { getIP } from "@/lib/api/utils/get-ip";
import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { RATE_LIMITS } from "@/lib/upstash/ratelimit-policy";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { actionClient } from "../safe-action";

const inputSchema = z.object({
  programSlug: z.string().trim().toLowerCase().min(1),
});

const rateLimitPolicy = RATE_LIMITS.programImageUpload;

export const uploadProgramApplicationImageAction = actionClient
  .inputSchema(inputSchema)
  .action(async ({ parsedInput }) => {
    const { programSlug } = parsedInput;

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

    const key = `programs/${program.id}/applications/${nanoid(10)}`;
    const signedUrl = await storage.getSignedUploadUrl({
      key,
    });

    return {
      signedUrl,
      destinationUrl: `${R2_URL}/${key}`,
    };
  });
