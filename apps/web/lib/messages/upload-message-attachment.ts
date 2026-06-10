"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import {
  MAX_ATTACHMENT_NAME_LENGTH,
  MAX_ATTACHMENT_SIZE_BYTES,
  PROGRAM_ALLOWED_ATTACHMENT_TYPES,
} from "@/lib/messages/constants";
import { sanitizeFileName } from "@/lib/messages/utils";
import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  fileName: z.string().trim().min(1).max(MAX_ATTACHMENT_NAME_LENGTH),
  contentType: z.enum(PROGRAM_ALLOWED_ATTACHMENT_TYPES),
  contentLength: z.number().int().positive().max(MAX_ATTACHMENT_SIZE_BYTES),
});

const rateLimitPolicy = RATELIMIT_POLICIES.messageAttachmentUpload;

export const uploadMessageAttachmentAction = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace, user } = ctx;
    const { fileName, contentType, contentLength } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredPermissions: ["messages.write"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);

    const { success } = await ratelimit(
      rateLimitPolicy.attempts,
      rateLimitPolicy.window,
    ).limit(`${rateLimitPolicy.keyPrefix}:${user.id}`);

    if (!success) {
      throw new Error("Too many file uploads. Please try again later.");
    }

    const storageKey = `messages/${programId}/${nanoid(10)}/${sanitizeFileName(fileName)}`;

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
