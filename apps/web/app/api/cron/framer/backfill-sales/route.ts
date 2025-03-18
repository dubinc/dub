import { createId } from "@/lib/api/create-id";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { getLeadEvent, recordSaleWithTimestamp } from "@/lib/tinybird";
import z from "@/lib/zod";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { CommissionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

const schema = z.object({
  externalId: z.string(),
  status: z.enum(["approved", "pending", "denied"]),
  creationDate: z.string(),
  conversionAmount: z.number(),
  invoiceId: z.string(),
});

const FRAMER_WORKSPACE_ID = "clsvopiw0000ejy0grp821me0";
const FRAMER_PROGRAM_ID = "prg...";

// POST /api/cron/framer/backfill-sales
export const POST = withWorkspace(async ({ req, workspace }) => {
  if (workspace.id !== FRAMER_WORKSPACE_ID) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { externalId, status, creationDate, conversionAmount, invoiceId } =
    schema.parse(await parseRequestBody(req));

  // Find existing commission
  const commissionFound = await prisma.commission.findUnique({
    where: {
      programId_invoiceId: {
        programId: FRAMER_PROGRAM_ID,
        invoiceId,
      },
    },
  });

  if (commissionFound) {
    return NextResponse.json({
      message: `Commission ${commissionFound.id} already exists, skipping...`,
    });
  }

  // find customer by externalId
  const customerFound = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId,
      },
    },
    include: {
      link: true,
    },
  });

  if (!customerFound) {
    return NextResponse.json({
      message: `Customer ${externalId} not found, skipping...`,
    });
  }

  if (
    !customerFound.linkId ||
    !customerFound.clickId ||
    !customerFound.link?.partnerId
  ) {
    return NextResponse.json({
      message: `No link or click ID or partner ID found for customer ${customerFound.id}, skipping...`,
    });
  }

  // Find program
  const program = await prisma.program.findUniqueOrThrow({
    where: {
      id: FRAMER_PROGRAM_ID,
    },
  });

  // Get lead event
  const leadEvent = await getLeadEvent({
    customerId: customerFound.id,
  });

  if (!leadEvent || leadEvent.data.length === 0) {
    return NextResponse.json({
      message: `No lead event found for customer ${customerFound.id}, skipping...`,
    });
  }

  const clickData = clickEventSchemaTB
    .omit({ timestamp: true })
    .parse(leadEvent.data[0]);

  const toDubStatus: Record<string, CommissionStatus> = {
    pending: "pending",
    approved: "pending",
    denied: "fraud",
  };

  const eventId = nanoid(16);

  await Promise.all([
    prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        eventId,
        type: "sale",
        programId: program.id,
        partnerId: customerFound.link.partnerId,
        linkId: customerFound.linkId,
        customerId: customerFound.id,
        amount: conversionAmount,
        earnings: conversionAmount, // TODO: get the actual earnings
        currency: "usd",
        quantity: 1,
        status: toDubStatus[status],
        invoiceId,
        createdAt: new Date(creationDate),
      },
    }),

    recordSaleWithTimestamp({
      ...clickData,
      event_id: eventId,
      event_name: "Invoice paid",
      amount: conversionAmount,
      customer_id: customerFound.id,
      payment_processor: "custom",
      currency: "usd",
      timestamp: new Date(creationDate).toISOString(),
    }),

    prisma.link.update({
      where: {
        id: customerFound.linkId,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: conversionAmount,
        },
      },
    }),
  ]);

  return NextResponse.json({
    message: "Commission created.",
  });
});
