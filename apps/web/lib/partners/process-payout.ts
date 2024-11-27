import { prisma } from "@/lib/prisma";
import { formatDate } from "@dub/utils";
import { Payout, Program, ProgramEnrollment, Project } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import PartnerPayoutSent from "emails/partner-payout-sent";
import { v5 as uuidv5 } from "uuid";
import { limiter } from "../cron/limiter";
import { createOrgTransfer } from "../dots/create-org-transfer";
import { createTransfer } from "../dots/create-transfer";

export const processPartnerPayout = async ({
  workspace,
  program,
  programEnrollment,
  payout,
}: {
  workspace: Pick<Project, "dotsAppId">;
  program: Pick<Program, "id" | "name" | "logo">;
  programEnrollment: Pick<ProgramEnrollment, "dotsUserId">;
  payout: Payout;
}) => {
  if (!workspace.dotsAppId) {
    throw new Error("Partner payouts are not enabled for this workspace.");
  }

  if (!programEnrollment.dotsUserId) {
    throw new Error("Partner is not properly enrolled in this program.");
  }

  const transfer = await createTransfer({
    amount: payout.amount,
    dotsAppId: workspace.dotsAppId,
    dotsUserId: programEnrollment.dotsUserId,
    idempotencyKey: uuidv5(payout.id, uuidv5.URL),
  });

  // we're splitting this out of the Promise.all() to avoid a race condition
  // e.g. if the transfer fails, we shouldn't proceed with creating the org transfer
  const orgTransfer = await createOrgTransfer({
    amount: payout.fee,
    dotsAppId: workspace.dotsAppId,
  });

  await Promise.all([
    prisma.payout.update({
      where: { id: payout.id },
      data: { dotsTransferId: transfer.id, status: "completed" },
    }),

    ...(payout.type === "sales"
      ? [
          prisma.sale.updateMany({
            where: { payoutId: payout.id },
            data: { status: "paid" },
          }),
        ]
      : []),
  ]);

  waitUntil(
    (async () => {
      const partnerUsers = await prisma.partnerUser.findMany({
        where: {
          partnerId: payout.partnerId,
        },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      await Promise.all(
        partnerUsers.map(({ user }) =>
          limiter.schedule(() =>
            sendEmail({
              subject: "You've been paid!",
              email: user.email!,
              from: "Dub Partners <system@dub.co>",
              react: PartnerPayoutSent({
                email: user.email!,
                program,
                payout: {
                  id: payout.id,
                  amount: payout.amount,
                  startDate: formatDate(payout.periodStart, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }),
                  endDate: formatDate(payout.periodEnd, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  }),
                },
              }),
            }),
          ),
        ),
      );
    })(),
  );

  return {
    transfer,
    orgTransfer,
  };
};
