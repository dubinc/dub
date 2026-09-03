import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { createId } from "@/lib/api/create-id";
import { DubApiError } from "@/lib/api/errors";
import { updateLinkStatsForImporter } from "@/lib/api/links/update-link-stats-for-importer";
import { syncPartnerLinksStats } from "@/lib/api/partners/sync-partner-links-stats";
import { generateRandomName } from "@/lib/names";
import { queuePartnerCommissionCreation } from "@/lib/partners/queue-partner-commission-creation";
import { EdgeLinkProps } from "@/lib/planetscale/types";
import { prisma } from "@/lib/prisma";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { saleEventSchemaTB } from "@/lib/zod/schemas/sales";
import { DEMO_PROGRAM_ID, nanoid } from "@dub/utils";
import { CommissionType } from "@prisma/client";
import * as z from "zod/v4";

const leadEventSchemaTBWithTimestamp = leadEventSchemaTB.extend({
  timestamp: z.string(),
});

const saleEventSchemaTBWithTimestamp = saleEventSchemaTB.extend({
  timestamp: z.string(),
});

export async function createDemoCommission({
  link,
  type,
  date,
  country,
  region,
  city,
  continent,
  referrer,
  userAgent,
  customer,
  sale,
}: {
  link: Pick<
    EdgeLinkProps,
    "id" | "url" | "domain" | "key" | "projectId" | "programId" | "partnerId"
  >;
  type: "lead" | "sale";
  date: Date;
  country: string;
  region?: string | null;
  city?: string | null;
  continent?: string | null;
  referrer?: string | null;
  userAgent?: string | null;
  customer: {
    name?: string | null;
    email?: string | null;
    externalId: string;
    country: string;
  };
  sale?: {
    amount: number;
    invoiceId?: string | null;
    eventName?: string | null;
  } | null;
}) {
  if (!link.partnerId) {
    throw new DubApiError({
      code: "bad_request",
      message: "Demo commissions require a partner link.",
    });
  }

  if (type === "sale" && sale?.amount == null) {
    throw new DubApiError({
      code: "bad_request",
      message: "sale.amount is required when type is sale.",
    });
  }

  const workspace = await prisma.project.findUnique({
    where: {
      id: link.projectId,
    },
    select: {
      id: true,
      stripeConnectId: true,
    },
  });

  if (!workspace) {
    throw new DubApiError({
      code: "not_found",
      message: "Demo workspace not found.",
    });
  }

  const targetLink = await prisma.link.findUnique({
    where: { id: link.id },
  });

  if (!targetLink) {
    throw new DubApiError({
      code: "not_found",
      message: `Link ${link.id} not found.`,
    });
  }

  const invoiceId = sale?.invoiceId ?? null;

  if (type === "sale" && invoiceId) {
    const existing = await prisma.commission.findUnique({
      where: {
        invoiceId_programId: {
          invoiceId,
          programId: DEMO_PROGRAM_ID,
        },
      },
      select: { id: true },
    });

    if (existing) {
      throw new DubApiError({
        code: "conflict",
        message: `There is already a commission for the invoice ${invoiceId}.`,
      });
    }
  }

  const customerId = createId({ prefix: "cus_" });
  const targetCustomer = await prisma.customer.upsert({
    where: {
      projectId_externalId: {
        projectId: workspace.id,
        externalId: customer.externalId,
      },
    },
    create: {
      id: customerId,
      name: customer.name || customer.email || generateRandomName(),
      email: customer.email,
      externalId: customer.externalId,
      country: customer.country,
      linkId: targetLink.id,
      projectId: workspace.id,
      projectConnectId: workspace.stripeConnectId,
      createdAt: date,
    },
    update: {
      name: customer.name || customer.email || generateRandomName(),
      email: customer.email,
      country: customer.country,
    },
  });

  const firstConversion = isFirstConversion({
    customer: targetCustomer,
    linkId: targetLink.id,
  });

  const clickedAt = new Date(date.getTime() - 5 * 60 * 1000);

  const clickEvent = await recordFakeClick({
    link: {
      id: targetLink.id,
      url: targetLink.url,
      domain: targetLink.domain,
      key: targetLink.key,
      projectId: targetLink.projectId,
      programId: targetLink.programId,
      partnerId: targetLink.partnerId,
    },
    customer: {
      country,
      region,
      city,
      continent,
    },
    referrer,
    userAgent,
    timestamp: clickedAt.toISOString(),
  });

  const eventTimestamp = date.toISOString();

  const leadEvent = leadEventSchemaTBWithTimestamp.parse({
    ...clickEvent,
    event_id: nanoid(16),
    event_name: "Sign up",
    customer_id: targetCustomer.id,
    timestamp: eventTimestamp,
    metadata: "",
  });

  const saleEvent =
    type === "sale" && sale
      ? saleEventSchemaTBWithTimestamp.parse({
          ...clickEvent,
          event_id: nanoid(16),
          event_name: sale.eventName ?? "Purchase",
          customer_id: targetCustomer.id,
          payment_processor: "stripe",
          amount: sale.amount,
          invoice_id: invoiceId ?? "",
          currency: "usd",
          timestamp: eventTimestamp,
          metadata: "",
        })
      : null;

  await Promise.all([
    recordLeadWithTimestamp(leadEvent),
    saleEvent ? recordSaleWithTimestamp(saleEvent) : undefined,
  ]);

  await queuePartnerCommissionCreation({
    event:
      type === "sale" ? CommissionType.sale : CommissionType.lead,
    programId: DEMO_PROGRAM_ID,
    partnerId: link.partnerId,
    linkId: targetLink.id,
    customerId: targetCustomer.id,
    eventId: saleEvent?.event_id ?? leadEvent.event_id,
    quantity: 1,
    createdAt: date,
    ...(saleEvent && {
      amount: saleEvent.amount,
      currency: saleEvent.currency,
      invoiceId: saleEvent.invoice_id || undefined,
      isFirstConversion: firstConversion,
    }),
    context: {
      customer: {
        country: targetCustomer.country,
        ...(type === "sale" && { signupDate: targetCustomer.createdAt }),
      },
      ...(type === "sale" &&
        saleEvent && {
          sale: {
            amount: saleEvent.amount,
          },
        }),
    },
    triggerAggregateDueCommissions: true,
  });

  const totalSales = saleEvent ? 1 : 0;
  const totalSaleAmount = saleEvent?.amount ?? 0;
  const lastLeadAt = updateLinkStatsForImporter({
    currentTimestamp: targetLink.lastLeadAt,
    newTimestamp: date,
  });
  const lastConversionAt = saleEvent
    ? updateLinkStatsForImporter({
        currentTimestamp: targetLink.lastConversionAt,
        newTimestamp: date,
      })
    : undefined;

  await prisma.$transaction([
    prisma.link.update({
      where: { id: targetLink.id },
      data: {
        clicks: { increment: 1 },
        leads: { increment: 1 },
        lastLeadAt,
        ...(firstConversion &&
          saleEvent && {
            conversions: { increment: 1 },
            lastConversionAt,
          }),
        sales: { increment: totalSales },
        saleAmount: { increment: totalSaleAmount },
      },
    }),
    prisma.customer.update({
      where: { id: targetCustomer.id },
      data: {
        linkId: targetLink.id,
        programId: targetLink.programId,
        partnerId: targetLink.partnerId,
        clickId: clickEvent.click_id,
        clickedAt,
        sales: { increment: totalSales },
        saleAmount: { increment: totalSaleAmount },
        ...(type === "sale" &&
          !targetCustomer.firstSaleAt && {
            firstSaleAt: date,
          }),
      },
    }),
  ]);

  await syncPartnerLinksStats({
    partnerId: link.partnerId,
    programId: DEMO_PROGRAM_ID,
    eventType: type,
  });

  return {
    clickId: clickEvent.click_id,
    customerId: targetCustomer.id,
  };
}
