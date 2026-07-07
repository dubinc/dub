import { createId } from "@/lib/api/create-id";
import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { groupBy, linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";
import { bulkCreateLinks } from "../../../lib/api/links/bulk-create-links";
import { syncTotalCommissions } from "../../../lib/api/partners/sync-total-commissions";

// case A: sales come from coupon code only (https://dub.slack.com/archives/C08S54HTHA8/p1782854750091729?thread_ts=1782830134.684169&cid=C08S54HTHA8)
// this variant is for handling cases where there are paid commissions via Dub – in this case we need to create a dummy commission to represent the overpayment + a clawback to balance the books
async function main() {
  const PROGRAM_ID = "prog_xxx";

  const links = await prisma.link.findMany({
    where: {
      id: {
        in: [],
      },
    },
    include: {
      discountCode: {
        include: {
          partner: true,
        },
      },
      partner: true,
      commissions: true,
    },
  });
  if (links.length === 0) {
    console.log("No links found");
    return;
  }
  console.log(`Found ${links.length} links`);

  const data = links.map((link) => ({
    id: link.id,
    currenctPartnerId: link.partnerId,
    actualPartnerId: link.discountCode?.partnerId,
    code: link.discountCode?.code,
    domain: link.domain,
    url: link.url,
    programId: link.programId,
    folderId: link.folderId,
    userId: link.userId,
    projectId: link.projectId,
    processedCommissions: link.commissions
      .filter((commission) => commission.status === "processed")
      .reduce((acc, commission) => acc + commission.earnings, 0),
    paidCommissions: link.commissions
      .filter((commission) => commission.status === "paid")
      .reduce((acc, commission) => acc + commission.earnings, 0),
    paidCommissionsViaDub: link.commissions
      .filter(
        (commission) =>
          commission.status === "paid" && commission.payoutId !== null,
      )
      .reduce((acc, commission) => acc + commission.earnings, 0),
    paidCommissionsImported: link.commissions
      .filter(
        (commission) =>
          commission.status === "paid" && commission.payoutId === null,
      )
      .reduce((acc, commission) => acc + commission.earnings, 0),
  }));

  const complexTransfer = data.filter((link) => link.paidCommissionsViaDub > 0);

  console.table(complexTransfer);

  for (const link of complexTransfer) {
    const updatedLink = await prisma.link.update({
      where: { id: link.id },
      data: {
        key: `${link.code}-coupon`,
        shortLink: linkConstructorSimple({
          domain: link.domain!,
          key: `${link.code}-coupon`,
        }),
        partnerId: link.actualPartnerId!,
        comments: `Link created for Rewardful coupon "${link.code}"`,
      },
    });
    console.log(
      `Updated link ${link.id} with key ${updatedLink.key} and shortLink ${updatedLink.shortLink} and partnerId ${link.actualPartnerId!}`,
    );
    const updatedCustomers = await prisma.customer.updateMany({
      where: {
        linkId: link.id,
      },
      data: {
        programId: PROGRAM_ID,
        partnerId: link.actualPartnerId!,
      },
    });
    console.log(
      `Updated ${updatedCustomers.count} customers for link ${link.id}`,
    );

    while (true) {
      // update non processed and non paid commissions (but include imported paid commissions) directly
      const updatedCommissions = await prisma.commission.updateMany({
        where: {
          linkId: link.id,
          partnerId: link.currenctPartnerId!,
          OR: [
            {
              status: "pending",
            },
            { status: "paid", payoutId: null },
          ],
        },
        data: {
          partnerId: link.actualPartnerId!,
        },
        limit: 250,
      });
      if (updatedCommissions.count < 250) {
        break;
      }
      console.log(
        `Updated ${updatedCommissions.count} non-processed commissions for link ${link.id}`,
      );
    }

    // update processed and paid commissions separately cause they're tied to a payout
    const processedAndPaidCommissions = await prisma.commission.findMany({
      where: {
        linkId: link.id,
        status: {
          in: ["processed", "paid"],
        },
      },
    });
    console.log(
      `Found ${processedAndPaidCommissions.length} processed and paid commissions for link ${link.id}`,
    );

    const updatedProcessedAndPaidCommissions =
      await prisma.commission.updateMany({
        where: {
          id: {
            in: processedAndPaidCommissions.map((commission) => commission.id),
          },
        },
        data: {
          partnerId: link.actualPartnerId!,
          payoutId: null,
          status: "pending",
        },
      });
    console.log(
      `Updated ${updatedProcessedAndPaidCommissions.count} processed and paid commissions for link ${link.id}`,
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
          partnerId: link.currenctPartnerId!,
          programId: PROGRAM_ID,
          description: `Overpayment for payout ${payoutId}`,
          earnings: paidCommissionsTotal,
          payoutId,
          amount: 0,
          quantity: 1,
          userId: link.userId,
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
          partnerId: link.currenctPartnerId!,
          programId: PROGRAM_ID,
          description: `Clawback for commission "${createdCommission.id}" (overpayment from incorrectly imported discount code "${link.code}")`,
          earnings: -paidCommissionsTotal,
          amount: 0,
          quantity: 1,
          userId: link.userId,
        },
      });

      console.log(
        `Created clawback ${createdClawback.id} for ${paidCommissionsTotal} paid commissions for link ${link.id}`,
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

    await syncTotalCommissions({
      partnerId: link.currenctPartnerId!,
      programId: PROGRAM_ID,
    });
    await syncTotalCommissions({
      partnerId: link.actualPartnerId!,
      programId: PROGRAM_ID,
    });

    // recreated the old link for the current partner
    const createdLinks = await bulkCreateLinks({
      links: [
        {
          domain: link.domain!,
          key: link.code!,
          url: link.url!,
          trackConversion: true,
          programId: PROGRAM_ID,
          partnerId: link.currenctPartnerId!,
          folderId: link.folderId,
          userId: link.userId,
          projectId: link.projectId,
        },
      ],
      skipRedisCache: true,
    });
    console.log(`Created ${createdLinks.length} links`);
  }
}

main();
