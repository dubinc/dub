import { getBountySubmissionUploadUrl } from "@/lib/bounty/api/get-bounty-submission-upload-url";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const bodySchema = z.object({
  fileName: z.string().trim().min(1),
  contentType: z.string().trim().min(1),
  contentLength: z.number().int().positive(),
});

// POST /api/embed/referrals/bounties/[bountyId]/upload – get a signed R2 upload URL for a bounty submission
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment, params }) => {
    const { bountyId } = params;
    const { fileName, contentType, contentLength } = bodySchema.parse(
      await req.json(),
    );

    const { signedUrl, destinationUrl } = await getBountySubmissionUploadUrl({
      bountyId,
      fileName,
      contentType,
      contentLength,
      programEnrollment,
    });

    return NextResponse.json({
      signedUrl,
      destinationUrl,
    });
  },
);
