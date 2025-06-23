"use server";

import { bulkCreateLinks } from "@/lib/api/links";
import { generatePartnerLink } from "@/lib/api/partners/create-partner-link";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { sendWorkspaceWebhook } from "@/lib/webhook/publish";
import {
  approvePartnersBulkSchema,
  EnrolledPartnerSchema,
} from "@/lib/zod/schemas/partners";
import { REWARD_EVENT_COLUMN_MAPPING } from "@/lib/zod/schemas/rewards";
import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { chunk, isFulfilled } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

// Approve partners applications in bulk
// A referral link will be created for each partner
export const approvePartnersBulkAction = authActionClient
  .schema(approvePartnersBulkSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;
    let { partnerIds } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [program, programEnrollments] = await Promise.all([
      getProgramOrThrow(
        {
          workspaceId: workspace.id,
          programId,
        },
        {
          includeDefaultRewards: true,
        },
      ),
      prisma.programEnrollment.findMany({
        where: {
          programId: programId,
          status: "pending",
          partnerId: {
            in: partnerIds,
          },
        },
        include: {
          partner: true,
        },
      }),
    ]);

    await prisma.programEnrollment.updateMany({
      where: {
        id: {
          in: programEnrollments.map(({ id }) => id),
        },
      },
      data: {
        status: "approved",
        ...(program.rewards &&
          program.rewards.length > 0 && {
            ...Object.fromEntries(
              program.rewards.map((r) => [
                REWARD_EVENT_COLUMN_MAPPING[r.event],
                r.id,
              ]),
            ),
          }),
      },
    });

    const programEnrollmentChunks = chunk(programEnrollments, 100);

    waitUntil(
      (async () => {
        // Create partner links
        const partnerLinks = await bulkCreateLinks({
          links: (
            await Promise.allSettled(
              programEnrollments.map(({ partner }) =>
                generatePartnerLink({
                  workspace,
                  program,
                  partner: {
                    name: partner.name,
                    email: partner.email!,
                  },
                  userId: user.id,
                  partnerId: partner.id,
                }),
              ),
            )
          )
            .filter(isFulfilled)
            .map(({ value }) => value),
        });

        await Promise.allSettled([
          // Send approval emails
          ...programEnrollmentChunks.map((chunk) =>
            resend?.batch.send(
              chunk.map(({ partner }) => ({
                subject: `Your application to join ${program.name} partner program has been approved!`,
                from: VARIANT_TO_FROM_MAP.notifications,
                to: partner.email!,
                react: PartnerApplicationApproved({
                  program: {
                    name: program.name,
                    logo: program.logo,
                    slug: program.slug,
                    supportEmail: program.supportEmail,
                  },
                  partner: {
                    name: partner.name,
                    email: partner.email!,
                    payoutsEnabled: Boolean(partner.payoutsEnabledAt),
                  },
                  rewardDescription: ProgramRewardDescription({
                    reward: program.rewards?.find((r) => r.event === "sale"),
                  }),
                }),
              })),
            ),
          ),

          // Send enrolled webhooks
          ...programEnrollments.map(({ partner, ...enrollment }) =>
            sendWorkspaceWebhook({
              workspace,
              trigger: "partner.enrolled",
              data: EnrolledPartnerSchema.parse({
                ...enrollment,
                ...partner,
                id: partner.id,
                links: partnerLinks.find(
                  ({ partnerId }) => partnerId === partner.id,
                ),
              }),
            }),
          ),
        ]);
      })(),
    );
  });
