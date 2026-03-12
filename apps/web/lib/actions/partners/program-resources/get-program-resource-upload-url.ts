"use server";

import { createId } from "@/lib/api/create-id";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { storage } from "@/lib/storage";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import slugify from "@sindresorhus/slugify";
import * as z from "zod/v4";
import { authActionClient } from "../../safe-action";
import { throwIfNoPermission } from "../../throw-if-no-permission";
import { MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES } from "./constants";

const schema = z.object({
  workspaceId: z.string(),
  resourceType: z.enum(["logo", "file"]),
  name: z.string().min(1, "Name is required"),
  extension: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid file extension")
    .nullish(),
  fileSize: z.number().int().positive(),
});

export const getProgramResourceUploadUrlAction = authActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { workspace } = ctx;
    const { resourceType, name, extension, fileSize } = parsedInput;

    throwIfNoPermission({
      role: workspace.role,
      requiredRoles: ["owner", "member"],
    });

    if (fileSize > MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES) {
      throw new Error(
        `File size exceeds the maximum allowed size of ${MAX_PROGRAM_RESOURCE_FILE_SIZE_BYTES / 1024 / 1024}MB`,
      );
    }

    const programId = getDefaultProgramIdOrThrow(workspace);

    const program = await prisma.program.findUnique({
      where: {
        id: programId,
        workspaceId: workspace.id,
      },
      select: {
        id: true,
      },
    });

    if (!program) throw new Error("Program not found");

    const resourceId = createId({ prefix: "pgr_" });
    const sanitizedExtension = extension
      ? extension.replace(/^\.+/, "").replace(/[^a-zA-Z0-9_-]/g, "")
      : null;
    const key = `programs/${program.id}/${resourceType}s/${slugify(name || resourceType)}-${nanoid(4)}${sanitizedExtension ? `.${sanitizedExtension}` : ""}`;

    const signedUrl = await storage.getSignedUploadUrl({
      key,
      expiresIn: 300,
      contentLength: fileSize,
    });

    return {
      signedUrl,
      destinationUrl: `${R2_URL}/${key}`,
      resourceId,
      key,
      fileSize,
    };
  });
