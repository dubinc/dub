import { createId } from "@/lib/api/create-id";
import { prisma } from "@dub/prisma";
import "dotenv-flow/config";

async function main() {
  const bountySubmissions = await prisma.bountySubmission.findMany({
    where: {
      bountyId: "bnty_1K4WFVHAH5V8R8DB5A3Z58KMB",
      status: "approved",
    },
    include: {
      commission: true,
    },
  });

  const payouts = await prisma.payout.findMany({
    where: {
      programId: bountySubmissions[0].programId,
      partnerId: {
        in: bountySubmissions.map((submission) => submission.partnerId),
      },
      status: "pending",
      id: {
        in: bountySubmissions.map(
          (submission) => submission.commission?.payoutId!,
        ),
      },
      amount: {
        gt: 200_00,
      },
      partner: {
        payoutsEnabledAt: {
          not: null,
        },
      },
    },
    include: {
      commissions: {
        where: {
          id: {
            in: bountySubmissions.map(
              (submission) => submission.commission?.id!,
            ),
          },
        },
      },
    },
  });
  console.log(
    `Found ${payouts.length} payouts to update, ${payouts.reduce((acc, payout) => acc + payout.commissions.length, 0)} commissions to update`,
  );

  for (const payout of payouts) {
    const otherCommissions = await prisma.commission.findMany({
      where: {
        payoutId: payout.id,
        id: {
          not: payout.commissions[0].id,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });
    if (otherCommissions.length === 0) {
      console.log(`No other commissions to update for payout ${payout.id}`);
      continue;
    }
    const totalEarnings = otherCommissions.reduce(
      (acc, commission) => acc + commission.earnings,
      0,
    );
    const periodStart = otherCommissions[0].createdAt;
    const periodEnd = otherCommissions[otherCommissions.length - 1].createdAt;

    const newPayout = await prisma.payout.create({
      data: {
        id: createId({ prefix: "po_" }),
        programId: payout.programId,
        partnerId: payout.partnerId,
        periodStart,
        periodEnd,
        amount: totalEarnings,
        description: "Dub Partners payout (Framer)",
      },
    });

    console.log(
      `Created new payout ${newPayout.id} with amount ${newPayout.amount}`,
    );

    const updatedOtherCommissions = await prisma.commission.updateMany({
      where: {
        payoutId: payout.id,
        id: {
          not: payout.commissions[0].id,
        },
      },
      data: {
        payoutId: newPayout.id,
      },
    });

    console.log(
      `Updated ${updatedOtherCommissions.count} other commissions to point to the new payout`,
    );

    const updateCurrentPayout = await prisma.payout.update({
      where: {
        id: payout.id,
      },
      data: {
        amount: payout.commissions[0].earnings,
        periodStart: payout.commissions[0].createdAt,
        periodEnd: payout.commissions[0].createdAt,
      },
    });
    console.log(
      `Updated current payout ${payout.id} with amount ${updateCurrentPayout.amount}`,
    );
  }

  const url = `https://app.dub.co/framer/program/payouts?status=pending&confirmPayouts=true&selectedPayoutIds=${payouts.map((payout) => payout.id).join(",")}`;
  console.log(url);
}

main();
