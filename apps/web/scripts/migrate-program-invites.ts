// @ts-nocheck – contains old prisma schemas

import { createId } from "@/lib/api/create-id";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { SaleEvent } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { EventType } from "@prisma/client";
import "dotenv-flow/config";
import { getEvents } from "../lib/analytics/get-events";
import { recordLink } from "../lib/tinybird";

async function main() {
  const programInvites = await prisma.programInvite.findMany({
    include: {
      link: true,
    },
    take: 10,
  });

  if (!programInvites.length) {
    console.log("No program invites found");
    return;
  }

  for (const programInvite of programInvites) {
    const partner = await prisma.partner.upsert({
      where: {
        email: programInvite.email,
      },
      update: {},
      create: {
        id: createId({ prefix: "pn_" }),
        name: programInvite.email.split("@")[0],
        email: programInvite.email,
      },
    });

    console.log(`Upserted partner ${partner.id}`);

    const programEnrollment = await prisma.programEnrollment.upsert({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId: programInvite.programId,
        },
      },
      update: {},
      create: {
        id: createId({ prefix: "pge_" }),
        programId: programInvite.programId,
        partnerId: partner.id,
        status: "invited",
      },
    });

    console.log(`Upserted program enrollment ${programEnrollment.id}`);

    const { link } = programInvite;
    if (link) {
      const linkRes = await prisma.link
        .update({
          where: {
            id: link.id,
          },
          data: {
            programId: programInvite.programId,
            partnerId: partner.id,
          },
        })
        .then((link) => recordLink(link));

      console.log(`Updated link ${link.id}`);

      if (link.sales > 0) {
        console.log(`Link ${link.id} has sales, recording as commissions`);
        await recordSalesAsCommissions({
          link,
          programId: programInvite.programId,
          partnerId: partner.id,
        });
      }
    }

    await prisma.programInvite.delete({
      where: {
        id: programInvite.id,
      },
    });
    console.log(`Deleted program invite ${programInvite.id}`);
  }
}

const recordSalesAsCommissions = async ({
  link,
  programId,
  partnerId,
}: {
  link;
  programId: string;
  partnerId: string;
}) => {
  if (link.sales === 0) {
    console.log(`Link ${link.id} has no sales, skipping backfill`);
    return;
  }

  const reward = await determinePartnerReward({
    programId,
    partnerId,
    event: "sale",
  });

  if (!reward) {
    return;
  }

  const { program, partner } = await prisma.programEnrollment.findUniqueOrThrow(
    {
      where: {
        partnerId_programId: {
          partnerId,
          programId,
        },
      },
      include: {
        program: {
          include: {
            workspace: true,
          },
        },
        partner: true,
      },
    },
  );

  const { workspace } = program;

  const saleEvents = await getEvents({
    workspaceId: workspace.id,
    linkId: link.id,
    event: "sales",
    interval: "all",
    page: 1,
    limit: 5000,
    sortOrder: "desc",
    sortBy: "timestamp",
  });

  const data = saleEvents.map((e: SaleEvent) => ({
    id: createId({ prefix: "cm_" }),
    programId: program.id,
    partnerId: partner.id,
    linkId: link.id,
    invoiceId: e.invoice_id || null,
    customerId: e.customer.id,
    eventId: e.eventId,
    amount: e.sale.amount,
    type: EventType.sale,
    quantity: 1,
    currency: "usd",
    createdAt: new Date(e.timestamp),
    earnings: calculateSaleEarnings({
      reward,
      sale: {
        quantity: 1,
        amount: e.sale.amount,
      },
    }),
  }));

  if (data.length > 0) {
    await prisma.commission.createMany({
      data,
      skipDuplicates: true,
    });
  }
};

main();
