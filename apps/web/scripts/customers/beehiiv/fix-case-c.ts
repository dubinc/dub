import { createId } from "@/lib/api/create-id";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { groupBy } from "@dub/utils";
import "dotenv-flow/config";
import { syncTotalCommissions } from "../../../lib/api/partners/sync-total-commissions";

// case B complex: sales comes from both link and discount code (https://dub.slack.com/archives/C08S54HTHA8/p1782854750091729?thread_ts=1782830134.684169&cid=C08S54HTHA8)
// for these, we first run fix-case-b for the given link, and then run this script to update for the coupon code sales
/*
  run all 3 scripts with this command:
p script customers/beehiiv/fix-case-c
p script tinybird/update-lead-event
p script tinybird/update-sale-event
*/
async function main() {
  const PROGRAM_ID = "prog_xxx";
  const CUSTOMER_ID = "cus_xxx";
  const OLD_LINK_ID = "link_xxx";
  const NEW_LINK_ID = "link_xxx";

  const [oldLink, newLink] = await Promise.all([
    prisma.link.findUniqueOrThrow({
      where: {
        id: OLD_LINK_ID,
      },
    }),
    prisma.link.findUniqueOrThrow({
      where: {
        id: NEW_LINK_ID,
      },
    }),
  ]);

  const updatedCustomer = await prisma.customer.update({
    where: {
      id: CUSTOMER_ID,
    },
    data: {
      linkId: newLink.id,
      programId: PROGRAM_ID,
      partnerId: newLink.partnerId!,
    },
  });
  console.log(
    `Updated customer ${CUSTOMER_ID} with linkId ${newLink.id} and partnerId ${newLink.partnerId}`,
  );

  // update non processed and non paid commissions (but include imported paid commissions) directly
  const updatedCommissions = await prisma.commission.updateMany({
    where: {
      customerId: CUSTOMER_ID,
      OR: [
        {
          status: {
            in: ["pending", "canceled"],
          },
        },
        { status: "paid", payoutId: null },
      ],
    },
    data: {
      linkId: newLink.id,
      partnerId: newLink.partnerId!,
    },
  });
  console.log(
    `Updated ${updatedCommissions.count} non-processed commissions for customer ${CUSTOMER_ID}`,
  );

  // update processed and paid commissions separately cause they're tied to a payout
  const processedAndPaidCommissions = await prisma.commission.findMany({
    where: {
      customerId: CUSTOMER_ID,
      linkId: oldLink.id,
      status: {
        in: ["processed", "paid"],
      },
    },
  });
  console.log(
    `Found ${processedAndPaidCommissions.length} processed and paid commissions for customer ${CUSTOMER_ID}`,
  );

  const updatedProcessedAndPaidCommissions = await prisma.commission.updateMany(
    {
      where: {
        id: {
          in: processedAndPaidCommissions.map((commission) => commission.id),
        },
      },
      data: {
        partnerId: newLink.partnerId!,
        payoutId: null,
        status: "pending",
      },
    },
  );
  console.log(
    `Updated ${updatedProcessedAndPaidCommissions.count} processed and paid commissions for customer ${CUSTOMER_ID}`,
  );

  // delete activity logs cause they'll be re-added to a new payout
  const deletedActivityLogs = await prisma.activityLog.deleteMany({
    where: {
      resourceType: "commission",
      resourceId: {
        in: processedAndPaidCommissions.map((commission) => commission.id),
      },
    },
  });
  console.log(
    `Deleted ${deletedActivityLogs.count} activity logs for commissions`,
  );

  const paidCommissionsViaDub = processedAndPaidCommissions.filter(
    (commission) =>
      commission.status === "paid" && commission.payoutId !== null,
  );
  const groupedByPayoutId = groupBy(
    paidCommissionsViaDub,
    (commission) => commission.payoutId!,
  );

  for (const payoutId of Object.keys(groupedByPayoutId)) {
    const paidCommissionsTotal = groupedByPayoutId[payoutId].reduce(
      (acc, commission) => acc + commission.earnings,
      0,
    );
    console.log(
      `Total paid commissions for payout ${payoutId}: ${paidCommissionsTotal}`,
    );

    // since these commissions were paid out to the wrong partner, we need to create a dummy commission to represent the overpayment + a clawback to balance the books
    // first, create the dummy commission for the current partner to represent the overpayment
    const createdCommission = await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        type: "custom",
        partnerId: oldLink.partnerId!,
        programId: PROGRAM_ID,
        description: `Overpayment for payout ${payoutId}`,
        earnings: paidCommissionsTotal,
        payoutId,
        amount: 0,
        quantity: 1,
        userId: oldLink.userId,
        status: "paid",
      },
    });

    console.log(
      `Created dummy commission ${createdCommission.id} for overpayment of ${paidCommissionsTotal} for payout ${payoutId}`,
    );

    // then, create the clawback for the current partner to balance the books
    const createdClawback = await prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        type: "custom",
        partnerId: oldLink.partnerId!,
        programId: PROGRAM_ID,
        description: `Clawback for commission "${createdCommission.id}" (overpayment for payout ${payoutId})`,
        earnings: -paidCommissionsTotal,
        amount: 0,
        quantity: 1,
        userId: oldLink.userId,
      },
    });

    console.log(
      `Created clawback ${createdClawback.id} for ${paidCommissionsTotal} paid commissions for link ${oldLink.id}`,
    );
  }

  // retally old payout ID values for processed commissions
  const processedCommissions = processedAndPaidCommissions.filter(
    (commission) => commission.status === "processed",
  );
  const payoutIdsToRetally = [
    ...new Set(
      processedCommissions
        .map((commission) => commission.payoutId!)
        .filter((payoutId): payoutId is string => Boolean(payoutId)),
    ),
  ];

  await retallyPayoutsAmount(payoutIdsToRetally);

  const updatedOldLink = await prisma.link.update({
    where: {
      id: oldLink.id,
    },
    data: {
      clicks: {
        decrement: 1,
      },
      leads: {
        decrement: 1,
      },
      conversions: {
        decrement: 1,
      },
      sales: {
        decrement: updatedCustomer.sales,
      },
      saleAmount: {
        decrement: updatedCustomer.saleAmount,
      },
    },
  });
  console.log(
    `Updated old link ${oldLink.id} with ${updatedOldLink.clicks} clicks, ${updatedOldLink.leads} leads, ${updatedOldLink.conversions} conversions, ${updatedOldLink.sales} sales, ${updatedOldLink.saleAmount} saleAmount`,
  );

  const updatedNewLink = await prisma.link.update({
    where: {
      id: newLink.id,
    },
    data: {
      clicks: {
        increment: 1,
      },
      leads: {
        increment: 1,
      },
      conversions: {
        increment: 1,
      },
      sales: {
        increment: updatedCustomer.sales,
      },
      saleAmount: {
        increment: updatedCustomer.saleAmount,
      },
    },
  });
  console.log(
    `Updated new link ${newLink.id} with ${updatedNewLink.clicks} clicks, ${updatedNewLink.leads} leads, ${updatedNewLink.conversions} conversions, ${updatedNewLink.sales} sales, ${updatedNewLink.saleAmount} saleAmount`,
  );

  await syncTotalCommissions({
    partnerId: oldLink.partnerId!,
    programId: PROGRAM_ID,
  });
  await syncTotalCommissions({
    partnerId: newLink.partnerId!,
    programId: PROGRAM_ID,
  });
}

main();
