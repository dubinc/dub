import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { chunk, isFulfilled } from "@dub/utils";
import { Partner, ProgramEnrollment } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { recordAuditLog } from "../api/audit-logs/record-audit-log";
import { bulkCreateLinks } from "../api/links";
import { generatePartnerLink } from "../api/partners/create-partner-link";
import { Session } from "../auth/utils";
import {
  DiscountProps,
  ProgramWithLanderDataProps,
  RewardProps,
  WorkspaceProps,
} from "../types";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";
import { sortRewardsByEventOrder } from "./sort-rewards-by-event-order";

export async function bulkApprovePartners({
  workspace,
  program,
  programEnrollments,
  rewards,
  discount,
  user,
}: {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: ProgramWithLanderDataProps;
  programEnrollments: (ProgramEnrollment & {
    partner: Partner & { users: { user: { email: string | null } }[] };
  })[];
  rewards: RewardProps[];
  discount: DiscountProps | null;
  user: Session["user"];
}) {
  await prisma.programEnrollment.updateMany({
    where: {
      id: {
        in: programEnrollments.map(({ id }) => id),
      },
    },
    data: {
      status: "approved",
      createdAt: new Date(),
      ...(rewards.length > 0 && {
        ...Object.fromEntries(
          rewards.map((r) => [REWARD_EVENT_COLUMN_MAPPING[r.event], r.id]),
        ),
      }),
      ...(discount && {
        discountId: discount.id,
      }),
    },
  });

  // Create all emails first, then chunk them into batches of 100
  const allEmails = programEnrollments.flatMap(({ partner }) => {
    const partnerEmailsToNotify = partner.users
      .map(({ user }) => user.email)
      .filter(Boolean) as string[];

    return partnerEmailsToNotify.map((email) => ({
      subject: `Your application to join ${program.name} partner program has been approved!`,
      from: VARIANT_TO_FROM_MAP.notifications,
      to: email,
      react: PartnerApplicationApproved({
        program: {
          name: program.name,
          logo: program.logo,
          slug: program.slug,
          supportEmail: program.supportEmail,
        },
        partner: {
          name: partner.name,
          email,
          payoutsEnabled: Boolean(partner.payoutsEnabledAt),
        },
        rewardDescription: ProgramRewardDescription({
          reward:
            sortRewardsByEventOrder(rewards.filter((r) => r.default))[0] ||
            rewards[0],
        }),
      }),
    }));
  });

  const emailChunks = chunk(allEmails, 100);

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
        ...emailChunks.map((emailChunk) => resend?.batch.send(emailChunk)),

        // Send enrolled webhooks
        ...programEnrollments.map(({ partner, ...enrollment }) =>
          sendWorkspaceWebhook({
            workspace,
            trigger: "partner.enrolled",
            data: EnrolledPartnerSchema.parse({
              ...enrollment,
              ...partner,
              status: enrollment.status,
              id: partner.id,
              links: partnerLinks.filter(
                ({ partnerId }) => partnerId === partner.id,
              ),
            }),
          }),
        ),

        recordAuditLog(
          programEnrollments.map(({ partner }) => ({
            workspaceId: workspace.id,
            programId: program.id,
            action: "partner_application.approved",
            description: `Partner application approved for ${partner.id}`,
            actor: user,
            targets: [
              {
                type: "partner",
                id: partner.id,
                metadata: partner,
              },
            ],
          })),
        ),
      ]);
    })(),
  );
}
