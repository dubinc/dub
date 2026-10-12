"use server";

import { MAX_ATTACHMENT_NAME_LENGTH } from "@/lib/messages/constants";
import { sanitizeFileName } from "@/lib/messages/utils";
import { prisma } from "@/lib/prisma";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../actions/safe-action";
import { COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES } from "../zod/schemas/partners";

const schema = z.object({
  programSlug: z.string(),
  fileName: z.string().trim().min(1).max(MAX_ATTACHMENT_NAME_LENGTH),
  ...signedUploadInputSchema.shape,
});

const uploadPolicy = "partnerMessageAttachments" as const;

export const uploadPartnerMessageAttachmentAction = authPartnerActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programSlug, fileName, contentType, contentLength } = parsedInput;

    validateSignedUpload({
      contentLength,
      contentType,
      policy: uploadPolicy,
    });

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.messageAttachmentUpload,
      identifier: partner.id,
    });

    const program = await prisma.program.findFirst({
      select: {
        id: true,
      },
      where: {
        slug: programSlug,

        OR: [
          {
            // program has messaging enabled
            messagingEnabledAt: {
              not: null,
            },
            // partner is active, archived or invited
            partners: {
              some: {
                partnerId: partner.id,
                status: {
                  in: COMMISSION_ELIGIBLE_ENROLLMENT_STATUSES,
                },
              },
            },
          },
          // partner has received a direct message from the program before (e.g. reached out via the marketplace)
          {
            messages: {
              some: {
                partnerId: partner.id,
                senderPartnerId: null,
              },
            },
          },
        ],
      },
    });

    if (!program) {
      throw new Error("You are not able to message this program.");
    }

    const { key, signedUrl } = await createSignedUploadUrl({
      key: `messages/${program.id}/${nanoid(10)}/${sanitizeFileName(fileName)}`,
      bucket: "private",
      contentLength,
      contentType,
    });

    return {
      signedUrl,
      storageKey: key,
    };
  });
