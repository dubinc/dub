"use server";

import { storage } from "@/lib/storage";
import { nanoid, R2_URL } from "@dub/utils";
import { z } from "zod";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  programId: z.string(),
});

export const uploadLanderImageAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { programId } = parsedInput;

    try {
      await getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      });

      const key = `programs/${programId}/lander/image_${nanoid(7)}`;

      const signedUrl = await storage.getSignedUrl(key);

      return {
        key,
        signedUrl,
        destinationUrl: `${R2_URL}/${key}`,
      };
    } catch (e) {
      throw new Error("Failed to get signed URL for upload.");
    }
  });
