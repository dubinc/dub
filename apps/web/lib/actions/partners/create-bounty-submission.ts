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
import { sendBatchEmail, sendEmail } from "@dub/email";
import NewBountySubmission from "@dub/email/templates/bounty-new-submission";
import BountySubmitted from "@dub/email/templates/bounty-submitted";
import { prisma } from "@dub/prisma";
import { BountySubmission, Role } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { formatDistanceToNow } from "date-fns";
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
  isDraft: z
    .boolean()
    .default(false)
    .describe("Whether to create a draft submission or a final submission."),
});

export const createBountySubmissionAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programId, bountyId, files, urls, description, isDraft } =
      parsedInput;

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

    let submission: BountySubmission | null = null;

    // Validate the partner has not already created a submission for this bounty
    if (bounty.submissions.length > 0) {
      submission = bounty.submissions[0];

      if (submission.status !== "draft") {
        throw new Error(
          `You already have a ${submission.status} submission for this bounty.`,
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

    if (bounty.submissionsOpenAt && bounty.submissionsOpenAt > now) {
      const waitTime = formatDistanceToNow(bounty.submissionsOpenAt, {
        addSuffix: true,
      });

      throw new Error(
        `Submissions are not open yet. You can submit ${waitTime}.`,
      );
    }

    // Validate the submission requirements
    const submissionRequirements = submissionRequirementsSchema.parse(
      bounty.submissionRequirements || [],
    );

    const requireImage = submissionRequirements.includes("image");
    const requireUrl = submissionRequirements.includes("url");

    if (!isDraft) {
      if (requireImage && files.length === 0) {
        throw new Error("You must submit an image.");
      }

      if (requireUrl && urls.length === 0) {
        throw new Error("You must submit a URL.");
      }
    }

    // If there is an existing submission, update it
    if (submission) {
      submission = await prisma.bountySubmission.update({
        where: {
          id: submission.id,
        },
        data: {
          description,
          ...(requireImage && { files }),
          ...(requireUrl && { urls }),
          status: isDraft ? "draft" : "submitted",
        },
      });
    }
    // If there is no existing submission, create a new one
    else {
      submission = await prisma.bountySubmission.create({
        data: {
          id: createId({ prefix: "bnty_sub_" }),
          programId: bounty.programId,
          bountyId: bounty.id,
          partnerId: partner.id,
          description,
          ...(requireImage && { files }),
          ...(requireUrl && { urls }),
          status: isDraft ? "draft" : "submitted",
        },
      });
    }

    waitUntil(
      (async () => {
        if (submission.status === "draft") {
          return;
        }

        // Send email to the program owners
        const { users, program, ...workspace } = await getWorkspaceUsers({
          programId,
          role: Role.owner,
          notificationPreference: "newBountySubmitted",
        });

        if (users.length > 0) {
          await sendBatchEmail(
            users.map((user) => ({
              variant: "notifications",
              to: user.email,
              subject: "New bounty submission",
              react: NewBountySubmission({
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
            to: partner.email,
            react: BountySubmitted({
              email: partner.email,
              bounty: {
                name: bounty.name,
              },
              program: {
                name: program.name,
                slug: program.slug,
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
