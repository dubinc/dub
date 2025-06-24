import { ProgramRewardDescription } from "@/ui/partners/program-reward-description";
import { resend } from "@dub/email/resend";
import { VARIANT_TO_FROM_MAP } from "@dub/email/resend/constants";
import PartnerApplicationApproved from "@dub/email/templates/partner-application-approved";
import { prisma } from "@dub/prisma";
import { chunk, isFulfilled } from "@dub/utils";
import { Partner, ProgramEnrollment } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { bulkCreateLinks } from "../api/links";
import { generatePartnerLink } from "../api/partners/create-partner-link";
import { ProgramProps, WorkspaceProps } from "../types";
import { sendWorkspaceWebhook } from "../webhook/publish";
import { EnrolledPartnerSchema } from "../zod/schemas/partners";
import { REWARD_EVENT_COLUMN_MAPPING } from "../zod/schemas/rewards";

export async function bulkApprovePartners({
  workspace,
  program,
  programEnrollments,
  userId,
}: {
  workspace: Pick<WorkspaceProps, "id" | "plan" | "webhookEnabled">;
  program: ProgramProps;
  programEnrollments: (ProgramEnrollment & { partner: Partner })[];
  userId: string;
}) {
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
                userId,
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
              status: enrollment.status,
              id: partner.id,
              links: partnerLinks.filter(
                ({ partnerId }) => partnerId === partner.id,
              ),
            }),
          }),
        ),
      ]);
    })(),
  );
}
