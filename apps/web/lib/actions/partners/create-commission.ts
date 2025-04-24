"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { recordClick } from "@/lib/tinybird/record-click";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { createCommissionSchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { authActionClient } from "../safe-action";

export const createCommissionAction = authActionClient
  .schema(createCommissionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace } = ctx;

    const {
      programId,
      partnerId,
      linkId,
      invoiceId,
      customerId,
      saleAmount,
      saleEventDate,
      leadEventDate,
      leadEventName,
    } = parsedInput;

    const finalLeadEventDate = leadEventDate ?? saleEventDate ?? new Date();

    const [programEnrollment, customer] = await Promise.all([
      getProgramEnrollmentOrThrow({
        programId,
        partnerId,
      }),
      prisma.customer.findUniqueOrThrow({
        where: {
          id: customerId,
        },
      }),
    ]);

    const { program, partner, links } = programEnrollment;

    if (program.workspaceId !== workspace.id) {
      throw new Error(`Program ${programId} not found.`);
    }

    if (customer.projectId !== workspace.id) {
      throw new Error(`Customer ${customerId} not found.`);
    }

    const link = links.find((l) => l.id === linkId);

    if (!link) {
      throw new Error(
        `Link ${linkId} does not belong to partner ${partner.email} (${partnerId}).`,
      );
    }

    if (invoiceId) {
      const commission = await prisma.commission.findUnique({
        where: {
          programId_invoiceId: {
            programId,
            invoiceId,
          },
        },
        select: {
          id: true,
        },
      });

      if (commission) {
        throw new Error(
          `There is already a commission for the invoice ${invoiceId}.`,
        );
      }
    }

    // Record click
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
      linkId,
      clickId: nanoid(16),
      url: link.url,
      domain: link.domain,
      key: link.key,
      workspaceId: workspace.id,
      skipRatelimit: true,
      timestamp: new Date(
        new Date(finalLeadEventDate).getTime() - 5 * 60 * 1000,
      ).toISOString(),
    });

    // Record lead
    const clickEvent = clickEventSchemaTB.parse({
      ...clickData,
      bot: 0,
      qr: 0,
    });

    const leadEventId = nanoid(16);

    await recordLeadWithTimestamp({
      ...clickEvent,
      event_id: leadEventId,
      event_name: leadEventName || "Sign up",
      customer_id: customerId,
      timestamp: new Date(finalLeadEventDate).toISOString(),
    });

    if (!customer.linkId && clickData) {
      await prisma.customer.update({
        where: {
          id: customerId,
        },
        data: {
          linkId,
          clickId: clickData.click_id,
          clickedAt: clickData.timestamp,
        },
      });
    }

    await createPartnerCommission({
      event: "lead",
      programId,
      partnerId,
      linkId,
      eventId: leadEventId,
      customerId,
      amount: 0,
      quantity: 1,
      createdAt: finalLeadEventDate,
    });

    // Record sale
    const toRecordSale = saleAmount && saleEventDate;
    if (toRecordSale) {
      const clickEvent = clickEventSchemaTB.parse({
        ...clickData,
        bot: 0,
        qr: 0,
      });

      const saleEventId = nanoid(16);

      await recordSaleWithTimestamp({
        ...clickEvent,
        event_id: saleEventId,
        event_name: "Purchase",
        amount: saleAmount,
        customer_id: customerId,
        payment_processor: "custom",
        currency: "usd",
        timestamp: new Date(saleEventDate).toISOString(),
      });

      await createPartnerCommission({
        event: "sale",
        programId,
        partnerId,
        linkId,
        eventId: saleEventId,
        customerId,
        amount: saleAmount,
        quantity: 1,
        invoiceId,
        currency: "usd",
        createdAt: saleEventDate,
      });
    }

    // Update link stats
    await prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        clicks: {
          increment: 1,
        },
        leads: {
          increment: 1,
        },
        ...(toRecordSale && {
          sales: {
            increment: 1,
          },
          saleAmount: {
            increment: saleAmount,
          },
        }),
      },
    });
  });
