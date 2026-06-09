"use server";

import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import {
  MAX_ATTACHMENT_SIZE_BYTES,
  PARTNER_ALLOWED_ATTACHMENT_TYPES,
} from "@/lib/zod/schemas/messages";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programSlug: z.string(),
  fileName: z.string().trim().min(1),
  contentType: z.enum(PARTNER_ALLOWED_ATTACHMENT_TYPES),
  contentLength: z.number().int().positive().max(MAX_ATTACHMENT_SIZE_BYTES),
});

const rateLimitPolicy = RATELIMIT_POLICIES.messageAttachmentUpload;

export const uploadPartnerMessageAttachmentAction = authPartnerActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programSlug, fileName, contentType, contentLength } = parsedInput;

    const { success } = await ratelimit(
      rateLimitPolicy.attempts,
      rateLimitPolicy.window,
    ).limit(`${rateLimitPolicy.keyPrefix}:${partner.id}`);

    if (!success) {
      throw new Error("Too many file uploads. Please try again later.");
    }

    const program = await prisma.program.findFirstOrThrow({
      select: {
        id: true,
      },
      where: {
        slug: programSlug,
        partners: {
          none: {
            partnerId: partner.id,
            status: "banned",
          },
        },
        OR: [
          {
            messagingEnabledAt: {
              not: null,
            },
            partners: {
              some: {
                partnerId: partner.id,
              },
            },
          },
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

    const key = `programs/${program.id}/messages/${nanoid(20)}/${fileName}`;

    const signedUrl = await storage.getSignedUploadUrl({
      key,
      contentLength,
      contentType,
    });

    return {
      signedUrl,
      destinationUrl: `${R2_URL}/${key}`,
    };
  });
