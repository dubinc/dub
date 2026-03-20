import { getBountySubmissionUploadUrl } from "@/lib/bounty/api/get-bounty-submission-upload-url";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { NextResponse } from "next/server";

// POST /api/embed/referrals/bounties/[bountyId]/upload – get a signed R2 upload URL for a bounty submission
export const POST = withReferralsEmbedToken(
  async ({ programEnrollment, params }) => {
    const { bountyId } = params;

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
