import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { sendEmail } from "@dub/email";
import PartnerPayoutWithdrawalCompleted from "@dub/email/templates/partner-payout-withdrawal-completed";
import { prisma } from "@dub/prisma";
import { currencyFormatter, log, pluralize, prettyPrint } from "@dub/utils";
import * as z from "zod/v4";
import { logAndRespond } from "../../utils";

const payloadSchema = z.object({
  stripeAccount: z.string(),
  stripePayout: z.object({
    id: z.string(),
    traceId: z.string().nullable(),
    amount: z.number(),
    currency: z.string(),
    arrivalDate: z.number(),
  }),
});

// POST /api/cron/payouts/payout-paid
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    await verifyQstashSignature({ req, rawBody });

    const { stripeAccount, stripePayout } = payloadSchema.parse(
      JSON.parse(rawBody),
    );

    const partner = await prisma.partner.findUnique({
      where: {
        stripeConnectId: stripeAccount,
      },
      select: {
        email: true,
      },
    });

    if (!partner) {
      return logAndRespond(
        `Partner not found with Stripe connect account ${stripeAccount}. Skipping...`,
      );
    }

    const updatedPayouts = await prisma.payout.updateMany({
      where: {
        stripePayoutId: stripePayout.id,
      },
      data: {
        status: "completed",
        stripePayoutTraceId: stripePayout.traceId,
      },
    });

    if (partner.email) {
      const sentEmail = await sendEmail({
        variant: "notifications",
        subject: `Your ${currencyFormatter(stripePayout.amount, { currency: stripePayout.currency })} auto-withdrawal from Dub has been transferred to your bank`,
        to: partner.email,
        react: PartnerPayoutWithdrawalCompleted({
          email: partner.email,
          payout: {
            amount: stripePayout.amount,
            currency: stripePayout.currency,
            arrivalDate: stripePayout.arrivalDate,
            traceId: stripePayout.traceId,
          },
        }),
      });

      console.log(
        `Sent email to partner ${partner.email} (${stripeAccount}): ${prettyPrint(sentEmail)}`,
      );
    }

    return logAndRespond(
      `Updated ${updatedPayouts.count} ${pluralize("payout", updatedPayouts.count)} for partner ${partner.email} (${stripeAccount}) to "completed" status.`,
    );
  } catch (error) {
    await log({
      message: `Error handling "payout.paid" ${error.message}.`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
