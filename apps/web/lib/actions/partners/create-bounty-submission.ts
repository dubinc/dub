"use server";

import { getBountyOrThrow } from "@/lib/api/bounties/get-bounty-or-throw";
import { getWorkspaceUsers } from "@/lib/api/get-workspace-users";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { BountySubmissionFileSchema } from "@/lib/zod/schemas/bounties";
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
  files: z.array(BountySubmissionFileSchema),
  urls: z.array(z.string().url()),
  description: z.string().trim().max(1000).optional(),
});

export const createBountySubmissionAction = authPartnerActionClient
  .schema(schema)
  .action(async ({ ctx, parsedInput }) => {
    const { partner } = ctx;
    const { programId, bountyId, files, urls, description } = parsedInput;

    const [bounty, _] = await Promise.all([
      await getBountyOrThrow({
        bountyId,
        programId,
      }),

      getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId,
        includePartner: true,
      }),
    ]);

    // TODO: We need to check the following
    // if the partner has already submitted a bounty for this program
    // if the partner is in allowed bounty groups
    // bounty start and end date
    // archivedAt bounty can't be submitted
    // Partner enrollment status
    // Validate submission requirements if specified (max number of files/URLs)
    // Validate file types and sizes if specified

    const submission = await prisma.bountySubmission.create({
      data: {
        programId,
        bountyId,
        partnerId: partner.id,
        files,
        urls,
        description,
      },
    });

    waitUntil(
      (async () => {
        // Send email to the program owners
        const { users, program, ...workspace } = await getWorkspaceUsers({
          programId,
          role: Role.owner,
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
