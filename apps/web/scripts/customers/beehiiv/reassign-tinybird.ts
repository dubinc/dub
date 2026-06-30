import { prisma } from "@/lib/prisma";
import { tb } from "@/lib/tinybird/client";
import { getClickEvent } from "@/lib/tinybird/get-click-event";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import * as z from "zod/v4";
import { DRY_RUN } from "./reassign-utils";

const TB_BASE =
  process.env.TINYBIRD_API_URL || "https://api.us-east.tinybird.co";

const getRawCustomerEvents = tb.buildPipe({
  pipe: "internal_get_events",
  parameters: z.object({ customerId: z.string() }),
  data: z.any(),
});

async function parseTinybirdResponse(res: Response) {
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`Tinybird request failed (${res.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function tbDelete(dataSource: string, condition: string) {
  if (DRY_RUN) {
    console.log(`      [dry] DELETE ${dataSource} WHERE ${condition}`);
    return;
  }

  const res = await fetch(`${TB_BASE}/v0/datasources/${dataSource}/delete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `delete_condition=${condition}`,
  }).then(parseTinybirdResponse);

  console.log(`      deleted ${dataSource}: ${JSON.stringify(res)}`);
}

async function tbIngest(datasource: string, payload: unknown) {
  return fetch(`${TB_BASE}/v0/events?name=${datasource}&wait=true`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TINYBIRD_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  }).then(parseTinybirdResponse);
}

// Move a single customer's events from `oldLinkId` to `newLinkId`.
export async function moveCustomerEvents({
  customerId,
  oldLinkId,
  newLinkId,
}: {
  customerId: string;
  oldLinkId: string;
  newLinkId: string;
}) {
  if (!oldLinkId || !newLinkId || oldLinkId === newLinkId) return;

  const newLink = await prisma.link.findUnique({
    where: { id: newLinkId },
    select: { id: true, key: true },
  });

  if (!newLink) {
    console.log(
      `      ⚠️  destination link ${newLinkId} not found, skipping events`,
    );
    return;
  }

  const { data: allEvents } = await getRawCustomerEvents({ customerId });

  const events = allEvents.filter((e: any) => e.link_id === oldLinkId);

  const sales = events.filter(
    (e: any) => "amount" in e && e.amount !== null && e.amount !== undefined,
  );
  const leads = events.filter(
    (e: any) => !("amount" in e) || e.amount === null || e.amount === undefined,
  );

  console.log(
    `      ${leads.length} lead event(s), ${sales.length} sale event(s)`,
  );

  if (leads.length > 0) {
    if (!DRY_RUN) {
      await recordLeadWithTimestamp(
        leads.map((e: any) => ({
          ...e,
          link_id: newLink.id,
          key: newLink.key,
        })),
      );
    }
    const condition = `customer_id='${customerId}' and link_id='${oldLinkId}'`;
    await tbDelete("dub_lead_events", condition);
    await tbDelete("dub_lead_events_mv", condition);
  }

  if (sales.length > 0) {
    if (!DRY_RUN) {
      await recordSaleWithTimestamp(
        sales.map((e: any) => ({
          ...e,
          link_id: newLink.id,
          key: newLink.key,
        })),
      );
    }
    const condition = `customer_id='${customerId}' and link_id='${oldLinkId}'`;
    await tbDelete("dub_sale_events", condition);
    await tbDelete("dub_sale_events_mv", condition);
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { clickId: true },
  });

  if (customer?.clickId) {
    const click = await getClickEvent({ clickId: customer.clickId });

    if (click && click.link_id === oldLinkId) {
      console.log(`      1 click event (${customer.clickId})`);

      if (!DRY_RUN) {
        await tbIngest("dub_click_events", {
          ...click,
          link_id: newLink.id,
          key: newLink.key,
        });
      }

      const condition = `click_id='${customer.clickId}' and link_id='${oldLinkId}'`;

      await tbDelete("dub_click_events_mv", condition);
      await tbDelete("dub_click_events_id", condition);
      await tbDelete("dub_click_events", condition);
    }
  }
}
