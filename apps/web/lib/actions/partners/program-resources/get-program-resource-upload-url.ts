"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
import { nanoid } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import * as z from "zod/v4";
import { authActionClient } from "../../safe-action";
import { throwIfNoPermission } from "../../throw-if-no-permission";

const schema = z.object({
  workspaceId: z.string(),
  resourceType: z.enum(["logo", "file"]),
  name: z.string().min(1, "Name is required"),
  extension: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid file extension")
    .nullish(),
  ...signedUploadInputSchema.shape,
});

export const getProgramResourceUploadUrlAction = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { resourceType, name, extension, contentType, contentLength } =
      parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    const programId = getDefaultProgramIdOrThrow(workspace);
    const resourceId = createId({ prefix: "pgr_" });

    const sanitizedExtension = extension
      ? extension.replace(/^\.+/, "").replace(/[^a-zA-Z0-9_-]/g, "")
      : null;
    const key = `programs/${programId}/${resourceType}s/${slugify(name || resourceType)}-${nanoid(4)}${sanitizedExtension ? `.${sanitizedExtension}` : ""}`;

    const uploadPolicy =
      resourceType === "logo"
        ? ("programResourceLogos" as const)
        : ("programResourceFiles" as const);

    validateSignedUpload({
      contentLength,
      contentType,
      policy: uploadPolicy,
    });

    const { signedUrl, destinationUrl } = await createSignedUploadUrl({
      key,
      contentType,
      contentLength,
    });

    return {
      signedUrl,
      destinationUrl,
      resourceId,
      key,
    };
  });
