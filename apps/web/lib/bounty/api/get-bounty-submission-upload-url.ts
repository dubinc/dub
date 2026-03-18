import { DubApiError } from "@/lib/api/errors";
import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { submissionRequirementsSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { ProgramEnrollment } from "@dub/prisma/client";
import { nanoid, R2_URL } from "@dub/utils";

const MAX_ATTEMPTS = 25;
const CACHE_KEY_PREFIX = "bounty:submission:file:upload";

type GetBountySubmissionUploadUrlParams = {
  bountyId: string;
  programEnrollment: Pick<
    ProgramEnrollment,
    "programId" | "partnerId" | "groupId"
  >;
};

export async function getBountySubmissionUploadUrl({
  bountyId,
  programEnrollment,
}: GetBountySubmissionUploadUrlParams) {
  const { programId, partnerId } = programEnrollment;

  const { success } = await ratelimit(MAX_ATTEMPTS, "24 h").limit(
    `${CACHE_KEY_PREFIX}:${bountyId}:${partnerId}`,
  );

  if (!success) {
    throw new DubApiError({
      code: "rate_limit_exceeded",
      message:
        "You've reached the maximum number of attempts to upload a file for this bounty.",
    });
  }

  const bounty = await prisma.bounty.findUniqueOrThrow({
    where: {
      id: bountyId,
    },
    select: {
      programId: true,
      type: true,
      startsAt: true,
      endsAt: true,
      archivedAt: true,
      submissionRequirements: true,
      groups: {
        select: {
          groupId: true,
        },
      },
    },
  });

  if (bounty.programId !== programId) {
    throw new DubApiError({
      code: "forbidden",
      message: "This bounty is not for this program.",
    });
  }

  if (bounty.groups.length > 0) {
    const isInGroup = bounty.groups.find(
      ({ groupId }) => groupId === programEnrollment.groupId,
    );

    if (!isInGroup) {
      throw new Error("You are not allowed to submit this bounty.");
    }
  }

  // Validate the bounty dates
  const now = new Date();

  if (bounty.startsAt && bounty.startsAt > now) {
    throw new Error("This bounty is not yet available.");
  }

  if (bounty.endsAt && bounty.endsAt < now) {
    throw new Error("This bounty is no longer available.");
  }

  if (bounty.archivedAt) {
    throw new Error("This bounty is archived.");
  }

  if (bounty.type === "performance") {
    throw new Error("You are not allowed to submit a performance bounty.");
  }

  // Validate the submission requirements
  const submissionRequirements = submissionRequirementsSchema.parse(
    bounty.submissionRequirements,
  );

  const requireImage = !!submissionRequirements?.image;

  if (!requireImage) {
    throw new Error(
      "The submission requirements for this bounty do not allow for file uploads.",
    );
  }

  try {
    const key = `programs/${programId}/bounties/${bountyId}/submissions/${partnerId}/${nanoid(7)}`;
    const signedUrl = await storage.getSignedUploadUrl({
      key,
    });

    return {
      signedUrl,
      destinationUrl: `${R2_URL}/${key}`,
    };
  } catch (e) {
    throw new Error("Failed to get signed URL for upload.");
  }
}
