"use server";

import { prisma } from "@/lib/prisma";
import { formatDate } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import PartnerPayoutSent from "emails/partner-payout-sent";
import { z } from "zod";
import { createOrgTransfer } from "../../dots/create-org-transfer";
import { createTransfer } from "../../dots/create-transfer";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  payoutId: z.string(),
});

export const createPartnerPayoutAction = authActionClient
  .schema(schema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;
    const { payoutId } = parsedInput;

    if (!workspace.dotsAppId) {
      throw new Error("Partner payouts are not enabled for this workspace.");
    }

    const payout = await prisma.payout.findUniqueOrThrow({
      where: { id: payoutId },
    });

    const programEnrollment = await prisma.programEnrollment.findUniqueOrThrow({
      where: {
        partnerId_programId: {
          partnerId: payout.partnerId,
          programId: payout.programId,
        },
      },
      select: {
        dotsUserId: true,
        program: true,
      },
    });

    if (!programEnrollment.dotsUserId) {
      throw new Error("Partner is not properly enrolled in this program");
    }

    const [transfer, orgTransfer] = await Promise.all([
      createTransfer({
        amount: payout.amount,
        dotsAppId: workspace.dotsAppId,
        dotsUserId: programEnrollment.dotsUserId,
      }),
      createOrgTransfer({
        amount: payout.fee,
        dotsAppId: workspace.dotsAppId,
      }),
    ]);

    // await Promise.all([
    //   prisma.payout.update({
    //     where: { id: payoutId },
    //     data: { dotsTransferId: transfer.id, status: "completed" },
    //   }),

    //   prisma.sale.updateMany({
    //     where: { payoutId },
    //     data: { status: "paid" },
    //   }),
    // ]);

    waitUntil(
      (async () => {
        const { program } = programEnrollment;

        const { user } = await prisma.partnerUser.findFirstOrThrow({
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

        sendEmail({
          subject: "You've been paid!",
          email: user.email!,
          from: "Dub Partners <system@dub.co>",
          react: PartnerPayoutSent({
            email: user.email!,
            program,
            payout: {
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
        });
      })(),
    );

    return { transfer, orgTransfer };
  });
