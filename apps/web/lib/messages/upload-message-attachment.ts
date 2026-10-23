"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { MAX_ATTACHMENT_NAME_LENGTH } from "@/lib/messages/constants";
import { sanitizeFileName } from "@/lib/messages/utils";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { nanoid } from "@dub/utils";
import * as z from "zod/v4";
import { authActionClient } from "../actions/safe-action";
import { throwIfNoPermission } from "../actions/throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  fileName: z.string().trim().min(1).max(MAX_ATTACHMENT_NAME_LENGTH),
  ...signedUploadInputSchema.shape,
});

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

    validateSignedUpload({
      contentLength,
      contentType,
      policy: "programMessageAttachments",
    });

    await assertRateLimit({
      policy: RATELIMIT_POLICIES.messageAttachmentUpload,
      identifier: user.id,
    });

    const { key, signedUrl } = await createSignedUploadUrl({
      key: `messages/${programId}/${nanoid(10)}/${sanitizeFileName(fileName)}`,
      bucket: "private",
      contentLength,
      contentType,
    });
    return {
      signedUrl,
      storageKey: key,
    };
  });
