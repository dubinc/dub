"use server";

import { createId } from "@/lib/api/create-id";
import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import {
  BountySubmissionFileSchema,
  MAX_SUBMISSION_FILES,
  MAX_SUBMISSION_URLS,
  submissionRequirementsSchema,
} from "@/lib/zod/schemas/bounties";
import { sendEmail } from "@dub/email";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import BountyPendingReview from "@dub/email/templates/bounty-pending-review";
import BountySubmitted from "@dub/email/templates/bounty-submitted";
import { prisma } from "@dub/prisma";
import { Role } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programId: z.string(),
  bountyId: z.string(),
  files: z
    .array(BountySubmissionFileSchema)
    .max(MAX_SUBMISSION_FILES)
    .default([]),
  urls: z.array(z.string().url()).max(MAX_SUBMISSION_URLS).default([]),
  description: z.string().trim().max(1000).optional(),
});

export const createBountySubmissionAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programId, bountyId, files, urls, description } = parsedInput;

    const [programEnrollment, bounty] = await Promise.all([
      getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId,
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
      throw new Error("You have already created a submission for this bounty.");
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

    const requireImage = submissionRequirements.includes("image");
    const requireUrl = submissionRequirements.includes("url");

    if (requireImage && files.length === 0) {
      throw new Error("You must submit an image.");
    }

    if (requireUrl && urls.length === 0) {
      throw new Error("You must submit a URL.");
    }

    // Create the submission
    const submission = await prisma.bountySubmission.create({
      data: {
        id: createId({ prefix: "bnty_sub_" }),
        programId: bounty.programId,
        bountyId: bounty.id,
        partnerId: partner.id,
        description,
        ...(requireImage && { files }),
        ...(requireUrl && { urls }),
      },
    });

    waitUntil(
      (async () => {
        // Send email to the program owners
        const { users, program, ...workspace } = await getWorkspaceUsers({
          programId,
          role: Role.owner,
          notificationPreference: "newBountySubmitted",
        });

        if (users.length > 0) {
          await resend?.batch.send(
            users.map((user) => ({
              from: VARIANT_TO_FROM_MAP.notifications,
              to: user.email,
              subject: "Pending bounty review",
              react: BountyPendingReview({
                email: user.email,
                workspace: {
                  slug: workspace.slug,
                },
                bounty: {
                  id: bounty.id,
                  name: bounty.name,
                },
                partner: {
                  name: partner.name,
                  image: partner.image,
                  email: partner.email!,
                },
                submission: {
                  id: submission.id,
                },
              }),
            })),
          );
        }

        // Send email to the partner
        if (partner.email && program) {
          await sendEmail({
            subject: "Bounty submitted!",
            email: partner.email,
            react: BountySubmitted({
              email: partner.email,
              bounty: {
                name: bounty.name,
              },
              program: {
                name: program.name,
                slug: program.slug,
                supportEmail: program.supportEmail || "support@dub.co",
              },
            }),
          });
        }
      })(),
    );

    return {
      success: true,
    };
  });
