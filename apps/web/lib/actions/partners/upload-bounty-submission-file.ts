"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { storage } from "@/lib/storage";
import { nanoid, R2_URL } from "@dub/utils";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programId: z.string(),
});

export const uploadBountySubmissionFileAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: parsedInput.programId,
    });

    try {
      const key = `programs/${program.id}/bounties/submissions/${partner.id}/image_${nanoid(7)}`;

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
