import { createId } from "@/lib/api/create-id";
import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
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
import { parseDateSchema } from "@/lib/zod/schemas/utils";
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
    creationDate: parseDateSchema,
  }),
);

// type coercion cause for some reason the return type of parseDateSchema is not Date
type PayloadItem = {
  via: string;
  externalId: string;
  eventName: string;
  creationDate: Date;
};

const FRAMER_WORKSPACE_ID = "clsvopiw0000ejy0grp821me0";
const CACHE_KEY = "framerMigratedExternalIdEventNames";
const DOMAIN = "framer.link";

// POST /api/cron/framer/backfill-leads-batch
export const POST = withWorkspace(async ({ req, workspace }) => {
  try {
    if (workspace.id !== FRAMER_WORKSPACE_ID) {
      throw new DubApiError({
        code: "unauthorized",
        message: "Unauthorized",
      });
    }

    const originalPayload = schema.parse(
      await parseRequestBody(req),
    ) as PayloadItem[];

    const externalIdEventNames = originalPayload.map(
      (p) => `${p.externalId}:${p.eventName}`,
    );

    const [existsResults, links] = await Promise.all([
      redis.smismember(CACHE_KEY, externalIdEventNames),
      prisma.link.findMany({
        where: {
          shortLink: {
            in: originalPayload.map((p) =>
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
      }),
    ]);

    let validEntries: PayloadItem[] = [];
    let invalidEntries: (PayloadItem & { error: string })[] = [];

    originalPayload.map((p, index) => {
      if (existsResults[index]) {
        invalidEntries.push({
          ...p,
          error: "Already backfilled.",
        });
        return;
      }

      if (!links.some((l) => l.key === p.via)) {
        invalidEntries.push({
          ...p,
          error: `Link for via tag ${p.via} not found.`,
        });
        return;
      }

      if (
        links.some((l) => l.key === p.via && (!l.partnerId || !l.programId))
      ) {
        invalidEntries.push({
          ...p,
          error: `Link for via tag ${p.via} has no partnerId or programId.`,
        });
        return;
      }

      validEntries.push(p);
    });

    const linkMap = new Map(links.map((l) => [l.key, l]));

    const customerData = validEntries.map((p) => {
      return {
        id: createId({ prefix: "cus_" }),
        name: generateRandomName(),
        externalId: p.externalId,
        projectId: workspace.id,
        projectConnectId: workspace.stripeConnectId,
        clickId: nanoid(16),
        linkId: linkMap.get(p.via)!.id,
        clickedAt: p.creationDate,
        createdAt: p.creationDate,
      };
    });

    await prisma.customer.createMany({
      data: customerData,
      skipDuplicates: true,
    });

    const finalCustomers = await prisma.customer.findMany({
      where: {
        projectId: workspace.id,
        externalId: {
          in: customerData.map((c) => c.externalId),
        },
      },
    });

    const customerMap = new Map(
      finalCustomers.map((c) => [
        c.externalId,
        { id: c.id, clickId: c.clickId },
      ]),
    );

    if (validEntries.length === 0) {
      return NextResponse.json({
        success: [],
        errors: invalidEntries,
      });
    }

    const dataArray = validEntries.map((p) => {
      const link = linkMap.get(p.via)!;

      const clickData = {
        timestamp: p.creationDate.toISOString(),
        identity_hash: p.externalId,
        click_id: customerMap.get(p.externalId)!.clickId,
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

      const leadEventData = {
        ...clickEvent,
        event_id: nanoid(16),
        event_name: p.eventName,
        customer_id: customerMap.get(p.externalId)!.id,
        timestamp: p.creationDate.toISOString(),
      };

      const saleEventId = nanoid(16);

      const saleEventData = {
        ...clickEvent,
        event_id: saleEventId,
        event_name: "Invoice paid",
        amount: 0,
        customer_id: customerMap.get(p.externalId)!.id,
        payment_processor: "stripe",
        currency: "usd",
        timestamp: p.creationDate.toISOString(),
      };

      const commissionData: Prisma.CommissionCreateManyInput = {
        id: createId({ prefix: "cm_" }),
        eventId: saleEventId,
        type: "sale",
        programId: link.programId!,
        partnerId: link.partnerId!,
        linkId: link.id,
        customerId: customerMap.get(p.externalId)!.id,
        amount: 0,
        quantity: 1,
        status: "paid",
        createdAt: p.creationDate,
      };

      return {
        payload: p,
        linkData: link,
        clickData,
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

      // Record leads
      recordLeadWithTimestamp(dataArray.map((d) => d.leadEventData)),

      // Record commissions
      prisma.commission.createMany({
        data: dataArray.map((d) => d.commissionData),
        skipDuplicates: true,
      }),

      // Record sales
      recordSaleWithTimestamp(dataArray.map((d) => d.saleEventData)),

      // Cache the externalId:eventName pairs
      redis.sadd(
        CACHE_KEY,
        ...dataArray.map(
          ({ payload: { externalId, eventName } }) =>
            `${externalId}:${eventName}`,
        ),
      ),
    ]);

    waitUntil(
      (async () => {
        // Update link stats
        const linkCount = validEntries.reduce(
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
      success: dataArray.map((d) => ({
        ...d.payload,
        clickId: d.clickData.click_id,
        linkId: d.linkData.id,
        partnerId: d.linkData.partnerId,
        programId: d.linkData.programId,
        commissionId: d.commissionData.id,
      })),
      errors: invalidEntries,
    });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
});
