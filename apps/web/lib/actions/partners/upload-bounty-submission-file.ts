"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { storage } from "@/lib/storage";
import { ratelimit } from "@/lib/upstash";
import {
  submissionRequirementsSchema,
  hasImageRequirement,
} from "@/lib/zod/schemas/bounties";
import { prisma } from "@dub/prisma";
import { nanoid, R2_URL } from "@dub/utils";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programId: z.string(),
  bountyId: z.string(),
});

const MAX_ATTEMPTS = 5;
const CACHE_KEY_PREFIX = "bounty:submission:file:upload";

export const uploadBountySubmissionFileAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programId, bountyId } = parsedInput;

    const { success } = await ratelimit(MAX_ATTEMPTS, "24 h").limit(
      `${CACHE_KEY_PREFIX}:${bountyId}:${partner.id}`,
    );

    if (!success) {
      throw new Error(
        "You've reached the maximum number of attempts to upload a file for this bounty.",
      );
    }

    const [programEnrollment, bounty] = await Promise.all([
      getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId,
        include: {},
      }),

      prisma.bounty.findUniqueOrThrow({
        where: {
          id: bountyId,
        },
        include: {
          groups: true,
          submissions: {
            where: {
              partnerId: partner.id,
            },
          },
        },
      }),
    ]);

    if (!["approved", "pending"].includes(programEnrollment.status)) {
      throw new Error(
        "You are not allowed to submit a bounty for this program.",
      );
    }

    if (bounty.programId !== programId) {
      throw new Error("This bounty is not for this program.");
    }

    // Validate the partner has not already created a submission for this bounty
    if (bounty.submissions.length > 0) {
      const submission = bounty.submissions[0];

      if (submission.status !== "draft") {
        throw new Error(
          "You have already created a submission for this bounty.",
        );
      }
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

    const requireImage = hasImageRequirement(submissionRequirements);

    if (!requireImage) {
      throw new Error(
        "The submission requirements for this bounty do not allow for file uploads.",
      );
    }

    try {
      const key = `programs/${bounty.programId}/bounties/${bounty.id}/submissions/${partner.id}/${nanoid(7)}`;
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
  });
