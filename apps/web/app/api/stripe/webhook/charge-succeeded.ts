import { limiter } from "@/lib/cron/limiter";
import { stripe } from "@/lib/stripe";
import { sendEmail } from "@dub/email";
import { PartnerPayoutSent } from "@dub/email/templates/partner-payout-sent";
import { prisma } from "@dub/prisma";
import { formatDate } from "@dub/utils";
import Stripe from "stripe";

export async function chargeSucceeded(event: Stripe.Event) {
  const charge = event.data.object as Stripe.Charge;

  const { id: chargeId, receipt_url, transfer_group } = charge;

  if (!transfer_group) {
    console.log("No transfer group found, skipping...");
    return;
  }

  console.log({ chargeId, receipt_url, transfer_group });

  const invoice = await prisma.invoice.update({
    where: {
      id: transfer_group,
    },
    data: {
      status: "completed",
      receiptUrl: receipt_url,
    },
    include: {
      payouts: {
        include: {
          program: true,
          partner: {
            include: {
              users: {
                select: {
                  user: {
                    select: {
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!invoice) {
    console.log(`Invoice with transfer group ${transfer_group} not found.`);
    return;
  }

  for (const payout of invoice.payouts) {
    const transfer = await stripe.transfers.create({
      amount: payout.amount,
      currency: "usd",
      destination: payout.partner.stripeConnectId!,
      transfer_group: invoice.id,
      description: `Dub Partners payout (${payout.program.name})`,
    });

    console.log("Transfer created", transfer);

    const partnerUsers = payout.partner.users.map(({ user }) => user);

    await Promise.all([
      prisma.$transaction(async (tx) => {
        await tx.payout.update({
          where: {
            id: payout.id,
          },
          data: {
            stripeTransferId: transfer.id,
            status: "completed",
            paidAt: new Date(),
          },
        });

        await tx.sale.updateMany({
          where: {
            payoutId: payout.id,
          },
          data: {
            status: "paid",
          },
        });
      }),
      partnerUsers.map((user) =>
        limiter.schedule(() =>
          sendEmail({
            subject: "You've been paid!",
            email: user.email!,
            from: "Dub Partners <system@dub.co>",
            react: PartnerPayoutSent({
              email: user.email!,
              program: payout.program,
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
    ]);
  }
}
