"use server";

import { getEvents } from "@/lib/analytics/get-events";
import { createId } from "@/lib/api/create-id";
import { calculateSaleEarnings } from "@/lib/api/sales/calculate-sale-earnings";
import { determinePartnerReward } from "@/lib/partners/determine-partner-reward";
import { SaleEvent } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { EventType, Link } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authPartnerActionClient } from "../safe-action";

const acceptProgramInviteSchema = z.object({
  partnerId: z.string(),
  programId: z.string(),
});

export const acceptProgramInviteAction = authPartnerActionClient
  .schema(acceptProgramInviteSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { partner } = ctx;
    const { programId } = parsedInput;

    const programEnrollment = await prisma.programEnrollment.update({
      where: {
        partnerId_programId: {
          partnerId: partner.id,
          programId,
        },
        status: "invited",
      },
      data: {
        status: "approved",
      },
      include: {
        links: true,
      },
    });

    if (programEnrollment) {
      const partnerLink = programEnrollment.links[0];

      waitUntil(
        recordSalesAsCommissions({
          link: partnerLink,
          programId: programEnrollment.programId,
          partnerId: partner.id,
        }),
      );
    }
  });

const recordSalesAsCommissions = async ({
  link,
  programId,
  partnerId,
}: {
  link: Pick<Link, "id" | "sales">;
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
