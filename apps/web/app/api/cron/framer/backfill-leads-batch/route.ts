import { createId } from "@/lib/api/create-id";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { generateRandomName } from "@/lib/names";
import {
  recordLeadWithTimestamp,
  recordSaleWithTimestamp,
} from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { linkConstructorSimple, nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

const schema = z.array(
  z.object({
    via: z.string(),
    externalId: z.string(),
    eventName: z.string(),
    creationDate: z.string(),
  }),
);

// const FRAMER_WORKSPACE_ID = "clsvopiw0000ejy0grp821me0";
// const CACHE_KEY = "framerMigratedLeadEventNames";
// const DOMAIN = "framer.link";

const FRAMER_WORKSPACE_ID = "cl7pj5kq4006835rbjlt2ofka";
const CACHE_KEY = "framerMigratedLeadEventNames";
const DOMAIN = "dub.sh";

// POST /api/cron/framer/backfill-leads-batch
export const POST = withWorkspace(async ({ req, workspace }) => {
  if (workspace.id !== FRAMER_WORKSPACE_ID) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload = schema.parse(await parseRequestBody(req));

  // Filter out those eventName that are already recorded
  const eventNames = payload.map((p) => p.eventName);
  const existsResults = await redis.smismember(CACHE_KEY, eventNames);
  payload = payload.filter((_, index) => !existsResults[index]);

  const links = await prisma.link.findMany({
    where: {
      shortLink: {
        in: payload.map((p) =>
          linkConstructorSimple({
            domain: DOMAIN,
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

    const clickData = {
      timestamp: new Date(p.creationDate).toISOString(),
      identity_hash: nanoid(25), // TODO: Fix it
      click_id: nanoid(16),
      link_id: link.id,
      alias_link_id: "",
      url: link.url,
      ip: "",
      continent: "NA",
      country: "Unknown",
      region: "Unknown",
      city: "Unknown",
      latitude: "Unknown",
      longitude: "Unknown",
      vercel_region: "",
      device: "Desktop",
      device_vendor: "Unknown",
      device_model: "Unknown",
      browser: "Unknown",
      browser_version: "Unknown",
      engine: "Unknown",
      engine_version: "Unknown",
      os: "Unknown",
      os_version: "Unknown",
      cpu_architecture: "Unknown",
      ua: "Unknown",
      bot: 0,
      qr: 0,
      referer: "(direct)",
      referer_url: "(direct)",
    };

    const clickEvent = clickEventSchemaTB.parse(clickData);
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
    // Record clicks
    fetch(
      `${process.env.TINYBIRD_API_URL}/v0/events?name=dub_click_events&wait=true`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
          "Content-Type": "application/x-ndjson",
        },
        body: dataArray.map((d) => JSON.stringify(d.clickData)).join("\n"),
      },
    ),

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

    // Cache the eventName
    redis.sadd(CACHE_KEY, ...dataArray.map((d) => d.leadEventData.event_name)),
  ]);

  waitUntil(
    (async () => {
      // Update link stats
      const linkCount = payload.reduce(
        (acc, p) => {
          acc[p.via] = (acc[p.via] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );

      // Group the links by the number of times they appear in the payload
      const groupedLinks = Object.entries(linkCount).reduce(
        (acc, [key, value]) => {
          acc[value] = (acc[value] || []).concat(key);
          return acc;
        },
        {} as Record<number, string[]>,
      );

      await Promise.all(
        Object.entries(groupedLinks).map(([count, linkKeys]) =>
          prisma.link.updateMany({
            where: {
              shortLink: {
                in: linkKeys.map((key) =>
                  linkConstructorSimple({
                    domain: DOMAIN,
                    key,
                  }),
                ),
              },
            },
            data: {
              clicks: {
                increment: parseInt(count),
              },
              leads: {
                increment: parseInt(count),
              },
              sales: {
                increment: parseInt(count),
              },
            },
          }),
        ),
      );
    })(),
  );

  return NextResponse.json({
    message: `Backfilled ${payload.length} leads and sales.`,
  });
});
