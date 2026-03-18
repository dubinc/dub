import { getBountySubmissionUploadUrl } from "@/lib/bounty/api/get-bounty-submission-upload-url";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const bodySchema = z.object({
  bountyId: z.string(),
});

// POST /api/embed/referrals/submissions/upload – get a signed R2 upload URL for a bounty submission
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment }) => {
    const { bountyId } = bodySchema.parse(await req.json());

    const { signedUrl, destinationUrl } = await getBountySubmissionUploadUrl({
      bountyId,
      programEnrollment,
    });

    return NextResponse.json({
      signedUrl,
      destinationUrl,
    });
  },
);
