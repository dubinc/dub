import { createId } from "@/lib/api/create-id";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import {
  recordLeadWithTimestamp,
  recordSaleWithTimestamp,
} from "@/lib/tinybird";
import z from "@/lib/zod";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { linkConstructorSimple, nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

const schema = z.array(
  z.object({
    via: z.string(),
    externalId: z.string(),
    eventName: z.string(),
    creationDate: z.string(),
  }),
);

const FRAMER_WORKSPACE_ID = "clsvopiw0000ejy0grp821me0";

// POST /api/cron/framer/backfill-leads
export const POST = withWorkspace(async ({ req, workspace }) => {
  if (workspace.id !== FRAMER_WORKSPACE_ID) {
    return new Response("Unauthorized", { status: 401 });
  }

  const payload = schema.parse(await parseRequestBody(req));

  const links = await prisma.link.findMany({
    where: {
      shortLink: {
        in: payload.map((p) =>
          linkConstructorSimple({
            domain: "framer.link",
            key: p.via,
          }),
        ),
      },
    },
    select: {
      id: true,
      key: true,
      url: true,
      domain: true,
      programId: true,
      partnerId: true,
    },
  });

  const missingLinks = payload.filter(
    (p) => !links.some((l) => l.key === p.via),
  );

  if (missingLinks.length > 0) {
    return NextResponse.json({
      message: `Links not found: ${missingLinks.map((l) => l.via).join(", ")}.`,
    });
  }

  const linkMap = new Map(links.map((l) => [l.key, l]));

  const dataArray = payload.map((p) => {
    const link = linkMap.get(p.via)!;

    const dummyRequest = new Request(link.url, {
      headers: new Headers({
        "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
        "x-forwarded-for": "127.0.0.1",
        "x-vercel-ip-country": "US",
        "x-vercel-ip-country-region": "CA",
        "x-vercel-ip-continent": "NA",
      }),
    });

    const clickData = {
      req: dummyRequest,
      linkId: link.id,
      clickId: nanoid(16),
      url: link.url,
      domain: link.domain,
      key: link.key,
      workspaceId: workspace.id,
      skipRatelimit: true,
      timestamp: new Date(p.creationDate).toISOString(),
    };

    const clickEvent = clickEventSchemaTB.parse({
      ...clickData,
      bot: 0,
      qr: 0,
    });

    const customerId = createId({ prefix: "cus_" });

    const customerData = {
      id: customerId,
      name: generateRandomName(),
      externalId: p.externalId,
      projectId: workspace.id,
      projectConnectId: workspace.stripeConnectId,
      clickId: clickEvent.click_id,
      linkId: link.id,
      country: clickEvent.country,
      clickedAt: new Date(p.creationDate),
      createdAt: new Date(p.creationDate),
    };

    const leadEventData = {
      ...clickEvent,
      event_id: nanoid(16),
      event_name: p.eventName,
      customer_id: customerId,
      timestamp: new Date(p.creationDate).toISOString(),
    };

    const saleEventId = nanoid(16);

    const saleEventData = {
      ...clickEvent,
      event_id: saleEventId,
      event_name: "Invoice paid",
      amount: 0,
      customer_id: customerId,
      payment_processor: "custom",
      currency: "usd",
      timestamp: new Date(p.creationDate).toISOString(),
    };

    const commissionData: Prisma.CommissionCreateManyInput = {
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
      createdAt: new Date(p.creationDate),
    };

    return {
      clickData,
      customerData,
      leadEventData,
      saleEventData,
      commissionData,
    };
  });

  await Promise.all([
    // TODO: Record clicks?

    // Record customers
    prisma.customer.createMany({
      data: dataArray.map((d) => d.customerData),
      skipDuplicates: true,
    }),

    // Record leads
    recordLeadWithTimestamp(dataArray.map((d) => d.leadEventData)),

    // Record commissions
    prisma.commission.createMany({
      data: dataArray.map((d) => d.commissionData),
      skipDuplicates: true,
    }),

    // Record sales
    recordSaleWithTimestamp(dataArray.map((d) => d.saleEventData)),

    // TODO: Update link stats
  ]);

  return NextResponse.json({
    message: `Backfilled ${payload.length} leads and sales.`,
  });
});
