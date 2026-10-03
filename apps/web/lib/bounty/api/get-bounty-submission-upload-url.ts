import { DubApiError } from "@/lib/api/errors";
import { createSignedUploadUrl } from "@/lib/storage/create-signed-upload-url";
import { signedUploadInputSchema } from "@/lib/storage/schemas";
import { validateSignedUpload } from "@/lib/storage/validate-signed-upload";
import { assertRateLimit } from "@/lib/upstash/assert-rate-limit";
import { RATELIMIT_POLICIES } from "@/lib/upstash/ratelimit-policies";
import { submissionRequirementsSchema } from "@/lib/zod/schemas/bounties";
import { ACTIVE_ENROLLMENT_STATUSES } from "@/lib/zod/schemas/partners";
import { nanoid } from "@dub/utils";
import { ProgramEnrollment, ProgramPartnerTag } from "@prisma/client";
import * as z from "zod/v4";
import {
  bountyEligibilityIncludes,
  canPartnerSubmitBounty,
} from "./bounty-availability";
import { getBountyOrThrow } from "./get-bounty-or-throw";

type GetBountySubmissionUploadUrlParams = z.infer<
  typeof signedUploadInputSchema
> & {
  bountyId: string;
  fileName: string;
  programEnrollment: Pick<
    ProgramEnrollment,
    "programId" | "partnerId" | "groupId" | "status" | "createdAt"
  > & {
    programPartnerTags: Pick<ProgramPartnerTag, "partnerTagId">[];
  };
};

export async function getBountySubmissionUploadUrl({
  bountyId,
  fileName,
  contentType,
  contentLength,
  programEnrollment,
}: GetBountySubmissionUploadUrlParams) {
  const { programId, partnerId, status } = programEnrollment;

  if (!ACTIVE_ENROLLMENT_STATUSES.includes(status)) {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to submit a bounty for this program.",
    });
  }

  if (!fileName.trim()) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message: "File name is required.",
    });
  }

  validateSignedUpload({
    contentLength,
    contentType,
    policy: "bountySubmissionImages",
  });

  await assertRateLimit({
    policy: RATELIMIT_POLICIES.bountySubmissionUpload,
    identifier: [bountyId, partnerId],
  });

  const bounty = await getBountyOrThrow({
    bountyId,
    programId,
    include: {
      ...bountyEligibilityIncludes,
      program: {
        select: {
          id: true,
          defaultGroupId: true,
        },
      },
    },
  });

  if (bounty.type === "performance") {
    throw new DubApiError({
      code: "forbidden",
      message: "You are not allowed to submit a performance bounty.",
    });
  }

  const canSubmitBounty = canPartnerSubmitBounty({
    program: bounty.program,
    bounty,
    programEnrollment,
  });

  if (!canSubmitBounty) {
    throw new DubApiError({
      code: "not_found",
      message: "Bounty not found.",
    });
  }

  // Validate the submission requirements
  const submissionRequirements = submissionRequirementsSchema.parse(
    bounty.submissionRequirements,
  );

  const requireImage = !!submissionRequirements?.image;

  if (!requireImage) {
    throw new DubApiError({
      code: "unprocessable_entity",
      message:
        "The submission requirements for this bounty do not allow for file uploads.",
    });
  }

  try {
    const { signedUrl, destinationUrl } = await createSignedUploadUrl({
      key: `programs/${programId}/bounties/${bountyId}/submissions/${partnerId}/${nanoid(10)}`,
      contentType,
      contentLength,
    });

    return {
      signedUrl,
      destinationUrl,
    };
  } catch (e) {
    if (e instanceof DubApiError) {
      throw e;
    }

    throw new DubApiError({
      code: "internal_server_error",
      message: "Failed to get signed URL for upload.",
    });
  }
}
