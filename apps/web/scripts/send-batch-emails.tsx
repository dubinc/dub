import { prisma } from "@dub/prisma";
import { ACME_PROGRAM_ID, currencyFormatter } from "@dub/utils";
import "dotenv-flow/config";
import { queueBatchEmail } from "../lib/email/queue-batch-email";

async function main() {
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: ACME_PROGRAM_ID,
    },
  });

  const res = await queueBatchEmail(
    [
      {
        partner: { email: "steven@dub.co" },
        id: "po_1234567890",
        amount: 10000,
        periodStart: new Date("2025-10-01"),
        periodEnd: new Date("2025-10-31"),
        paymentMethod: "ach",
      },
      {
        partner: { email: "stevensteel97@gmail.com" },
        id: "po_1234567890",
        amount: 25000,
        periodStart: new Date("2025-10-01"),
        periodEnd: new Date("2025-10-31"),
        paymentMethod: "ach",
      },
    ].map((payout) => ({
      to: payout.partner.email!,
      subject: `Your ${currencyFormatter(payout.amount)} payout for ${program.name} is on the way`,
      variant: "notifications",
      replyTo: program.supportEmail || "noreply",
      templateName: "PartnerPayoutConfirmed",
      templateProps: {
        email: payout.partner.email!,
        program: {
          id: program.id,
          name: program.name,
          logo: program.logo,
        },
        payout: {
          id: payout.id,
          amount: payout.amount,
          startDate: payout.periodStart,
          endDate: payout.periodEnd,
          paymentMethod: "ach",
        },
      },
    })),
  );

  console.log({ res });
}

main();
