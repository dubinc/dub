import { DubApiError } from "@/lib/api/errors";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import { submissionRequirementsSchema } from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const MAX_ATTEMPTS = 25;
const CACHE_KEY_PREFIX = "bounty:submission:file:upload";

const bodySchema = z.object({
  bountyId: z.string(),
});

// POST /api/embed/referrals/submissions/upload – get a signed R2 upload URL for a bounty submission
export const POST = withReferralsEmbedToken(
  async ({ req, programEnrollment, group }) => {
    const { bountyId } = bodySchema.parse(await req.json());

    const { success } = await ratelimit(MAX_ATTEMPTS, "24 h").limit(
      `${CACHE_KEY_PREFIX}:${bountyId}:${programEnrollment.partnerId}`,
    );

    if (!success) {
      throw new DubApiError({
        code: "rate_limit_exceeded",
        message:
          "You've reached the maximum number of attempts to upload a file for this bounty.",
      });
    }

    const bounty = await prisma.bounty.findUniqueOrThrow({
      where: { id: bountyId },
      select: {
        programId: true,
        type: true,
        startsAt: true,
        endsAt: true,
        archivedAt: true,
        submissionRequirements: true,
        groups: { select: { groupId: true } },
      },
    });

    if (bounty.programId !== programEnrollment.programId) {
      throw new DubApiError({
        code: "forbidden",
        message: "This bounty is not for this program.",
      });
    }

    if (
      bounty.groups.length > 0 &&
      !bounty.groups.some((g) => g.groupId === group.id)
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "This bounty is not available for your group.",
      });
    }

    if (bounty.type === "performance") {
      throw new DubApiError({
        code: "forbidden",
        message:
          "You are not allowed to upload files for a performance bounty.",
      });
    }

    const now = new Date();

    if (bounty.startsAt && bounty.startsAt > now) {
      throw new DubApiError({
        code: "forbidden",
        message: "This bounty is not yet available.",
      });
    }

    if (bounty.endsAt && bounty.endsAt < now) {
      throw new DubApiError({
        code: "forbidden",
        message: "This bounty is no longer available.",
      });
    }

    if (bounty.archivedAt) {
      throw new DubApiError({
        code: "forbidden",
        message: "This bounty is archived.",
      });
    }

    const submissionRequirements = submissionRequirementsSchema.parse(
      bounty.submissionRequirements,
    );

    if (!submissionRequirements?.image) {
      throw new DubApiError({
        code: "forbidden",
        message:
          "The submission requirements for this bounty do not allow file uploads.",
      });
    }

    const key = `programs/${bounty.programId}/bounties/${bountyId}/submissions/${programEnrollment.partnerId}/${nanoid(7)}`;
    const signedUrl = await storage.getSignedUploadUrl({ key });

    return NextResponse.json({
      signedUrl,
      destinationUrl: `${R2_URL}/${key}`,
    });
  },
);
