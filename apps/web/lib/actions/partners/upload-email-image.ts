"use server";

import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { storage } from "@/lib/storage";
import { nanoid, R2_URL } from "@dub/utils";
import * as z from "zod/v4";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
});

export const uploadEmailImageAction = authActionClient
  .schema(schema)
  .action(async ({ ctx }) => {
    const { workspace } = ctx;
    const programId = getDefaultProgramIdOrThrow(workspace);

    try {
      const key = `programs/${programId}/emails/image_${nanoid(7)}`;
      const signedUrl = await storage.getSignedUploadUrl({
        key,
      });

      return {
        key,
        signedUrl,
        destinationUrl: `${R2_URL}/${key}`,
      };
    } catch (e) {
      throw new Error("Failed to get signed URL for upload.");
    }
  });
