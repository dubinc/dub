import { createId } from "@/lib/api/create-id";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import {
  recordClick,
  recordLeadWithTimestamp,
  recordSaleWithTimestamp,
} from "@/lib/tinybird";
import z from "@/lib/zod";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

const schema = z.object({
  via: z.string(),
  externalId: z.string(),
  eventName: z.string(),
  creationDate: z.string(),
});

const FRAMER_WORKSPACE_ID = "clsvopiw0000ejy0grp821me0";

// POST /api/cron/framer/backfill-leads
export const POST = withWorkspace(async ({ req, workspace }) => {
  if (workspace.id !== FRAMER_WORKSPACE_ID) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { via, externalId, eventName, creationDate } = schema.parse(
    await parseRequestBody(req),
  );

  const customer = await prisma.customer.findUnique({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId,
      },
    },
  });

  if (customer) {
    return NextResponse.json({
      message: `A customer already exists for externalId: ${externalId}.`,
    });
  }

  // if customer doesn't exist:
  // - record a dummy click
  // - create a customer
  // - record a lead
  // - record a sale
  // - increment link leads and sales
  const link = await prisma.link.findUniqueOrThrow({
    where: {
      domain_key: {
        domain: "framer.link",
        key: via,
      },
    },
  });

  const dummyRequest = new Request(link.url, {
    headers: new Headers({
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      "x-forwarded-for": "127.0.0.1",
      "x-vercel-ip-country": "US",
      "x-vercel-ip-country-region": "CA",
      "x-vercel-ip-continent": "NA",
    }),
  });

  const clickData = await recordClick({
    req: dummyRequest,
    linkId: link.id,
    clickId: nanoid(16),
    url: link.url,
    domain: link.domain,
    key: link.key,
    workspaceId: workspace.id,
    skipRatelimit: true,
    timestamp: new Date(creationDate).toISOString(),
  });

  const clickEvent = clickEventSchemaTB.parse({
    ...clickData,
    bot: 0,
    qr: 0,
  });

  const customerId = createId({ prefix: "cus_" });
  const saleEventId = nanoid(16);

  await Promise.all([
    // Record a lead
    prisma.customer.create({
      data: {
        id: customerId,
        name: generateRandomName(),
        externalId,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
        clickId: clickEvent.click_id,
        linkId: link.id,
        country: clickEvent.country,
        clickedAt: new Date(creationDate),
        createdAt: new Date(creationDate),
      },
    }),

    recordLeadWithTimestamp({
      ...clickEvent,
      event_id: nanoid(16),
      event_name: eventName,
      customer_id: customerId,
      timestamp: new Date(creationDate).toISOString(),
    }),

    // Record a sale
    prisma.commission.create({
      data: {
        id: createId({ prefix: "cm_" }),
        eventId: saleEventId,
        type: "sale",
        programId: link.programId!,
        partnerId: link.partnerId!,
        linkId: link.id,
        customerId: customerId,
        amount: 0,
        quantity: 1,
        status: "paid",
        createdAt: new Date(creationDate),
      },
    }),

    recordSaleWithTimestamp({
      ...clickEvent,
      event_id: saleEventId,
      event_name: "Invoice paid",
      amount: 0,
      customer_id: customerId,
      payment_processor: "custom",
      currency: "usd",
      timestamp: new Date(creationDate).toISOString(),
    }),

    // Update link stats
    prisma.link.update({
      where: { id: link.id },
      data: {
        leads: { increment: 1 },
        sales: { increment: 1 },
      },
    }),
  ]);

  return NextResponse.json({
    message: `Lead and sale recorded for ${externalId}.`,
  });
});
