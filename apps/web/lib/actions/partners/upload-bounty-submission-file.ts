"use server";

import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { storage } from "@/lib/storage";
import { nanoid, R2_URL } from "@dub/utils";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programId: z.string(),
  bountyId: z.string(),
});

export const uploadBountySubmissionFileAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programId, bountyId } = parsedInput;

    // TODO:
    // Limit the number of file a partner can upload for a bounty
    // Allow upload only if there is a submissionRequirements exists for the given bounty (AND type submissions only)
    // Rate limit the number of uploads per partner per bounty
    // Prevent submission if there is an existing submission for the partner

    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
    });

    const bounty = await getBountyOrThrow({
      bountyId,
      programId,
    });

    try {
      const key = `programs/${program.id}/bounties/${bounty.id}/submissions/${partner.id}/${nanoid(7)}`;
      const signedUrl = await storage.getSignedUrl(key);

      return {
        signedUrl,
        destinationUrl: `${R2_URL}/${key}`,
      };
    } catch (e) {
      throw new Error("Failed to get signed URL for upload.");
    }
  });
