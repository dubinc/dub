import { retallyPayoutsAmount } from "@/lib/payouts/retally-payouts-amount";
import { prisma } from "@/lib/prisma";
import { linkConstructorSimple } from "@dub/utils";
import "dotenv-flow/config";
import { bulkCreateLinks } from "../../../lib/api/links/bulk-create-links";
import { syncTotalCommissions } from "../../../lib/api/partners/sync-total-commissions";

// case A: sales come from coupon code only (https://dub.slack.com/archives/C08S54HTHA8/p1782854750091729?thread_ts=1782830134.684169&cid=C08S54HTHA8)
// this variant is for handling cases where there are no paid commissions via Dub – just do a simple swap
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
  console.log(`Found ${links.length} links`);
  if (links.length === 0) {
    console.log("No links found");
    return;
  }

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

  const simpleTransfer = data.filter(
    (link) => link.paidCommissionsViaDub === 0,
  );

  console.table(simpleTransfer);

  for (const link of simpleTransfer) {
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

    const updatedCommissions = await prisma.commission.updateMany({
      where: {
        linkId: link.id,
        status: {
          not: "processed",
        },
      },
      data: {
        partnerId: link.actualPartnerId!,
      },
    });
    console.log(
      `Updated ${updatedCommissions.count} non-processed commissions for link ${link.id}`,
    );

    // update processed commissions separately cause they're tied to a payout
    const processedCommissions = await prisma.commission.findMany({
      where: {
        linkId: link.id,
        status: "processed",
      },
    });
    console.log(
      `Found ${processedCommissions.length} processed commissions for link ${link.id}`,
    );

    const updatedProcessedCommissions = await prisma.commission.updateMany({
      where: {
        id: {
          in: processedCommissions.map((commission) => commission.id),
        },
      },
      data: {
        partnerId: link.actualPartnerId!,
        payoutId: null,
        status: "pending",
      },
    });
    console.log(
      `Updated ${updatedProcessedCommissions.count} processed commissions for link ${link.id}`,
    );

    // delete activity logs cause they'll be re-added to a new payout
    const deletedActivityLogs = await prisma.activityLog.deleteMany({
      where: {
        resourceType: "commission",
        resourceId: {
          in: processedCommissions.map((commission) => commission.id),
        },
      },
    });
    console.log(
      `Deleted ${deletedActivityLogs.count} activity logs for commissions`,
    );

    // retally old payout ID values
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
