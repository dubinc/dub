"use server";

import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { getLeadEvent } from "@/lib/tinybird";
import { recordFakeClick } from "@/lib/tinybird/record-fake-click";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import { ClickEventTB, LeadEventTB } from "@/lib/types";
import { createCommissionSchema } from "@/lib/zod/schemas/commissions";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { COUNTRIES_TO_CONTINENTS } from "@dub/utils/src";
import { waitUntil } from "@vercel/functions";
import { authActionClient } from "../safe-action";

export const createCommissionAction = authActionClient
  .schema(createCommissionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;

    const {
      partnerId,
      date,
      amount,
      linkId,
      invoiceId,
      customerId,
      saleAmount,
      saleEventDate,
      leadEventDate,
      leadEventName,
      description,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [{ partner, links }, customer] = await Promise.all([
      getProgramEnrollmentOrThrow({
        programId,
        partnerId,
      }),

      customerId
        ? prisma.customer.findUniqueOrThrow({
            where: {
              id: customerId,
            },
          })
        : Promise.resolve(null),
    ]);

    // Create a custom commission
    if (!linkId) {
      await createPartnerCommission({
        event: "custom",
        partnerId,
        programId,
        amount: amount ?? 0,
        quantity: 1,
        createdAt: date ?? new Date(),
        user,
        description,
      });

      return;
    }

    // Create a lead or sale commission
    if (!customerId || !customer) {
      throw new Error("Customer not found.");
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
          invoiceId_programId: {
            invoiceId,
            programId,
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

    let clickEvent: ClickEventTB | null = null;
    let leadEvent: LeadEventTB | null = null;
    let shouldUpdateCustomer = false;

    const existingLeadEvent = await getLeadEvent({
      customerId,
    });

    // if there is an existing lead event + no custom lead details were provided
    // we can use that leadEvent's existing details
    if (
      !leadEventDate &&
      !leadEventName &&
      existingLeadEvent &&
      existingLeadEvent.data.length > 0
    ) {
      leadEvent = leadEventSchemaTB.parse(existingLeadEvent.data[0]);
    } else {
      // else, if there's no existing lead event and there is also no custom leadEventName/Date
      // we need to create a dummy click + lead event (using the customer's country if available)

      const finalLeadEventDate = leadEventDate ?? saleEventDate ?? new Date();

      clickEvent = await recordFakeClick({
        link,
        timestamp: new Date(finalLeadEventDate).getTime() - 5 * 60 * 1000,
        ...(customer.country && {
          country: customer.country,
          continent: COUNTRIES_TO_CONTINENTS[customer.country.toUpperCase()],
        }),
      });

      const leadEventId = nanoid(16);

      leadEvent = leadEventSchemaTB.parse({
        ...clickEvent,
        event_id: leadEventId,
        event_name: leadEventName || "Sign up",
        customer_id: customerId,
      });

      shouldUpdateCustomer = !customer.linkId && clickEvent ? true : false;

      await Promise.allSettled([
        recordLeadWithTimestamp({
          ...leadEvent,
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
          user,
          context: {
            customer: {
              country: customer.country,
            },
          },
        }),
      ]);
    }

    if (saleAmount && leadEvent) {
      const saleEventId = nanoid(16);
      const saleDate = new Date(saleEventDate ?? Date.now());

      await Promise.allSettled([
        recordSaleWithTimestamp({
          ...leadEvent,
          event_id: saleEventId,
          event_name: "Purchase",
          amount: saleAmount,
          customer_id: customerId,
          payment_processor: "custom",
          currency: "usd",
          timestamp: saleDate.toISOString(),
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
          createdAt: saleDate,
          user,
          context: {
            customer: {
              country: customer.country,
            },
          },
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
            ...(isFirstConversion({
              customer,
              linkId,
            }) && {
              leads: {
                increment: 1,
              },
              conversions: {
                increment: 1,
              },
            }),
            ...(saleAmount && {
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
        (shouldUpdateCustomer || saleAmount) &&
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
              ...(saleAmount && {
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
