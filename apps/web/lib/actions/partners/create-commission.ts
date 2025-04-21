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
import { getLinkOrThrow } from "../../api/links/get-link-or-throw";
import { getProgramOrThrow } from "../../api/programs/get-program-or-throw";
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
      saleDate,
      leadDate,
    } = parsedInput;

    const [_, link, programEnrollment, customer] = await Promise.all([
      getProgramOrThrow({
        workspaceId: workspace.id,
        programId,
      }),

      getLinkOrThrow({
        workspaceId: workspace.id,
        linkId,
      }),

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

    if (programEnrollment.program.workspaceId !== workspace.id) {
      throw new Error(`Program ${programId} not found.`);
    }

    if (customer.projectId !== workspace.id) {
      throw new Error(`Customer ${customerId} not found.`);
    }

    if (invoiceId) {
      const commission = await prisma.commission.findUnique({
        where: {
          programId_invoiceId: {
            programId,
            invoiceId,
          },
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
      timestamp: new Date().toISOString(),
    });

    // Record lead
    const clickEvent = clickEventSchemaTB.parse({
      ...clickData,
      bot: 0,
      qr: 0,
    });

    const eventId = nanoid(16);

    await recordLeadWithTimestamp({
      ...clickEvent,
      event_id: eventId,
      event_name: "Sign up",
      customer_id: customerId,
      timestamp: leadDate
        ? new Date(leadDate).toISOString()
        : new Date().toISOString(),
    });

    // TODO:
    // Should we update the linkId, clickId, and clickedAt? for the customer?

    await createPartnerCommission({
      event: "lead",
      programId,
      partnerId,
      linkId,
      eventId,
      customerId,
      amount: 0,
      quantity: 1,
    });

    // Record sale
    const shouldRecordSale = saleAmount && saleDate;

    if (shouldRecordSale) {
      const clickEvent = clickEventSchemaTB.parse({
        ...clickData,
        bot: 0,
        qr: 0,
      });

      const eventId = nanoid(16);

      await recordSaleWithTimestamp({
        ...clickEvent,
        event_id: eventId,
        event_name: "Purchase",
        amount: saleAmount,
        customer_id: customerId,
        payment_processor: "custom",
        currency: "usd",
        timestamp: new Date(saleDate).toISOString(),
      });

      await createPartnerCommission({
        event: "sale",
        programId,
        partnerId,
        linkId,
        eventId,
        customerId,
        amount: saleAmount,
        quantity: 1,
        invoiceId,
        currency: "usd",
      });
    }
  });
