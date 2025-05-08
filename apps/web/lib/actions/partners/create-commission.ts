"use server";

import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { getLeadEvent } from "@/lib/tinybird";
import { recordClick } from "@/lib/tinybird/record-click";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import z from "@/lib/zod";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { createCommissionSchema } from "@/lib/zod/schemas/commissions";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { waitUntil } from "@vercel/functions";
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

    let clickEvent: z.infer<typeof clickEventSchemaTB> | null = null;
    let shouldUpdateCustomer = false;

    // if there's no existing lead event and there is also no custom leadEventName/Date
    // we need to create a dummy click + lead event
    if (!leadEventDate && !leadEventName) {
      const existingLeadEvent = await getLeadEvent({
        customerId,
      });
      if (existingLeadEvent && existingLeadEvent.data.length > 0) {
        // if there is an existing lead event, we can use that for the clickEvent details
        clickEvent = clickEventSchemaTB.parse(existingLeadEvent.data[0]);
      } else {
        // else, we need to record a dummy click
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
        clickEvent = clickEventSchemaTB.parse({
          ...clickData,
          bot: 0,
          qr: 0,
        });

        const leadEventId = nanoid(16);
        shouldUpdateCustomer = !customer.linkId && clickData ? true : false;

        await Promise.allSettled([
          recordLeadWithTimestamp({
            ...clickEvent,
            event_id: leadEventId,
            event_name: leadEventName || "Sign up",
            customer_id: customerId,
            timestamp: new Date(finalLeadEventDate).toISOString(),
          }),

          createPartnerCommission({
            event: "lead",
            programId,
            partnerId,
            linkId,
            eventId: leadEventId,
            customerId,
            amount: 0,
            quantity: 1,
            createdAt: finalLeadEventDate,
          }),
        ]);
      }
    }

    // Record sale
    const shouldRecordSale = saleAmount && saleEventDate;

    if (shouldRecordSale && clickEvent) {
      const saleEventId = nanoid(16);

      await Promise.allSettled([
        recordSaleWithTimestamp({
          ...clickEvent,
          event_id: saleEventId,
          event_name: "Purchase",
          amount: saleAmount,
          customer_id: customerId,
          payment_processor: "custom",
          currency: "usd",
          timestamp: new Date(saleEventDate).toISOString(),
        }),

        createPartnerCommission({
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
        }),
      ]);
    }

    // link & customer updates
    waitUntil(
      Promise.allSettled([
        // Update link stats
        prisma.link.update({
          where: {
            id: linkId,
          },
          data: {
            leads: {
              increment: 1,
            },
            ...(shouldRecordSale && {
              sales: {
                increment: 1,
              },
              saleAmount: {
                increment: saleAmount,
              },
            }),
          },
        }),

        // Update customer details / stats
        (shouldUpdateCustomer || shouldRecordSale) &&
          prisma.customer.update({
            where: {
              id: customerId,
            },
            data: {
              ...(shouldUpdateCustomer && {
                linkId,
                clickId: clickEvent?.click_id,
                clickedAt: clickEvent?.timestamp,
              }),
              ...(shouldRecordSale && {
                sales: {
                  increment: 1,
                },
                saleAmount: {
                  increment: saleAmount,
                },
              }),
            },
          }),
      ]),
    );
  });
