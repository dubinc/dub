"use server";

import { limiter } from "@/lib/cron/limiter";
import { createOrgTransfer } from "@/lib/dots/create-org-transfer";
import { createTransfer } from "@/lib/dots/create-transfer";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { sendEmail } from "emails";
import PartnerPayoutSent from "emails/partner-payout-sent";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";
import { authActionClient } from "../safe-action";

const schema = z.object({
  workspaceId: z.string(),
  payoutId: z.string(),
});

export const processPartnerPayoutAction = authActionClient
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

    const result = await prisma.programEnrollment.findUniqueOrThrow({
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

    const { program, ...programEnrollment } = result;

    if (!programEnrollment.dotsUserId) {
      throw new Error("Partner is not properly enrolled in this program");
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

    if (payout.type === "sales") {
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
                      startDate: formatDate(payout.periodStart!, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }),
                      endDate: formatDate(payout.periodEnd!, {
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
    }

    return {
      transfer,
      orgTransfer,
    };
  });
