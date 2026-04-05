"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { throwIfNoPermission } from "@/lib/auth/partner-users/throw-if-no-permission";
import { getBountySubmissionUploadUrl } from "@/lib/bounty/api/get-bounty-submission-upload-url";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programId: z.string(),
  bountyId: z.string(),
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  contentLength: z.number().int().positive(),
});

export const uploadBountySubmissionFileAction = authPartnerActionClient
  .inputSchema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner, partnerUser } = ctx;

    throwIfNoPermission({
      role: partnerUser.role,
      permission: "bounties.submit",
    });
    const { programId, bountyId, fileName, contentType, contentLength } =
      parsedInput;

    const programEnrollment = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId,
      include: {},
    });

    const { signedUrl, destinationUrl } = await getBountySubmissionUploadUrl({
      bountyId,
      fileName,
      contentType,
      contentLength,
      programEnrollment,
    });

    return {
      signedUrl,
      destinationUrl,
    };
  });
