"use server";

import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { BountySubmissionFileSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programId: z.string(),
  bountyId: z.string(),
  files: z.array(BountySubmissionFileSchema),
  urls: z.array(z.string().url()),
  description: z.string().trim().max(1000).optional(),
});

export const createBountySubmissionAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programId, bountyId, files, urls, description } = parsedInput;

    await Promise.all([
      getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId,
      }),

      await getBountyOrThrow({
        bountyId,
        programId,
      }),
    ]);

    // TODO: We need to check the following
    // if the partner has already submitted a bounty for this program
    // if the partner is in allowed bounty groups
    // bounty start and end date
    // archivedAt bounty can't be submitted
    // Partner enrollment status
    // Validate submission requirements if specified (max number of files/URLs)
    // Validate file types and sizes if specified

    await prisma.bountySubmission.create({
      data: {
        programId,
        bountyId,
        partnerId: partner.id,
        files,
        urls,
        description,
      },
    });

    return {
      success: true,
    };
  });
