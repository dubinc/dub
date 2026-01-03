"use server";

import { createId } from "@/lib/api/create-id";
import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import {
  BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH,
  BOUNTY_MAX_SUBMISSION_FILES,
  BOUNTY_MAX_SUBMISSION_URLS,
} from "@/lib/constants/bounties";
import {
  BountySubmissionFileSchema,
  submissionRequirementsSchema,
} from "@/lib/zod/schemas/bounties";
import { sendBatchEmail, sendEmail } from "@dub/email";
import NewBountySubmission from "@dub/email/templates/bounty-new-submission";
import BountySubmitted from "@dub/email/templates/bounty-submitted";
import { prisma } from "@dub/prisma";
import { BountySubmission, WorkspaceRole } from "@dub/prisma/client";
import { getDomainWithoutWWW } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { formatDistanceToNow } from "date-fns";
import * as z from "zod/v4";
import { authPartnerActionClient } from "../safe-action";

const schema = z.object({
  programId: z.string(),
  bountyId: z.string(),
  files: z
    .array(BountySubmissionFileSchema)
    .max(BOUNTY_MAX_SUBMISSION_FILES)
    .default([]),
  urls: z.array(z.url()).max(BOUNTY_MAX_SUBMISSION_URLS).default([]),
  description: z
    .string()
    .trim()
    .max(BOUNTY_MAX_SUBMISSION_DESCRIPTION_LENGTH)
    .optional(),
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

    if (
      !isDraft &&
      bounty.submissionsOpenAt &&
      bounty.submissionsOpenAt > now
    ) {
      const waitTime = formatDistanceToNow(bounty.submissionsOpenAt, {
        addSuffix: true,
      });

      throw new Error(
        `Submissions are not open yet. You can submit ${waitTime}.`,
      );
    }

    // Validate the submission requirements
    const submissionRequirements = bounty.submissionRequirements
      ? submissionRequirementsSchema.parse(bounty.submissionRequirements)
      : null;

    const requireImage = !!submissionRequirements?.image;
    const requireUrl = !!submissionRequirements?.url;
    const urlRequirement = submissionRequirements?.url || null;
    const imageRequirement = submissionRequirements?.image || null;

    if (!isDraft) {
      if (requireImage && files.length === 0) {
        throw new Error("You must submit an image.");
      }

      if (requireUrl && urls.length === 0) {
        throw new Error("You must submit a URL.");
      }

      // Validate URL domain restrictions
      if (
        urlRequirement?.domains &&
        urlRequirement.domains.length > 0 &&
        urls.length > 0
      ) {
        const allowedDomains = urlRequirement.domains
          .map((domain) => getDomainWithoutWWW(domain)?.toLowerCase())
          .filter((domain): domain is string => !!domain);

        if (allowedDomains.length > 0) {
          const invalidUrls = urls.filter((url) => {
            const urlDomain = getDomainWithoutWWW(url)?.toLowerCase();
            if (!urlDomain) return true;
            // Check if URL domain matches any allowed domain or is a subdomain
            return !allowedDomains.some(
              (allowedDomain) =>
                urlDomain === allowedDomain ||
                urlDomain.endsWith(`.${allowedDomain}`),
            );
          });

          if (invalidUrls.length > 0) {
            const domainsList = allowedDomains.join(", ");
            throw new Error(
              `All URLs must be from one of the following domains: ${domainsList}. Please check your submission.`,
            );
          }
        }
      }

      // Validate max count for URLs
      if (urlRequirement?.max && urls.length > urlRequirement.max) {
        throw new Error(
          `You can submit at most ${urlRequirement.max} URL${urlRequirement.max === 1 ? "" : "s"}.`,
        );
      }

      // Validate max count for images
      if (imageRequirement?.max && files.length > imageRequirement.max) {
        throw new Error(
          `You can submit at most ${imageRequirement.max} image${imageRequirement.max === 1 ? "" : "s"}.`,
        );
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
          ...(isDraft ? {} : { completedAt: new Date() }),
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
          ...(isDraft ? {} : { completedAt: new Date() }),
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
          role: WorkspaceRole.owner,
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
                  id: partner.id,
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
            replyTo: program.supportEmail || "noreply",
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
