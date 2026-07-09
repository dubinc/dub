"use server";

import {
  MAX_ATTACHMENT_NAME_LENGTH,
  MAX_ATTACHMENT_SIZE_BYTES,
  PARTNER_ALLOWED_ATTACHMENT_TYPES,
} from "@/lib/messages/constants";
import { sanitizeFileName } from "@/lib/messages/utils";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../actions/safe-action";

const schema = z.object({
  programSlug: z.string(),
  fileName: z.string().trim().min(1).max(MAX_ATTACHMENT_NAME_LENGTH),
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

    const storageKey = `messages/${program.id}/${nanoid(10)}/${sanitizeFileName(fileName)}`;

    const signedUrl = await storage.getSignedUploadUrl({
      key: storageKey,
      bucket: "private",
      contentLength,
      contentType,
    });

    return {
      signedUrl,
      storageKey,
    };
  });
