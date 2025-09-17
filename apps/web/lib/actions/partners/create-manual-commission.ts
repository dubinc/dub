"use server";

import { isFirstConversion } from "@/lib/analytics/is-first-conversion";
import { getStartEndDates } from "@/lib/analytics/utils/get-start-end-dates";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { executeWorkflows } from "@/lib/api/workflows/execute-workflows";
import { createPartnerCommission } from "@/lib/partners/create-partner-commission";
import { getLeadEvent, tb } from "@/lib/tinybird";
import { recordClick } from "@/lib/tinybird/record-click";
import { recordLeadWithTimestamp } from "@/lib/tinybird/record-lead";
import { recordSaleWithTimestamp } from "@/lib/tinybird/record-sale";
import { ClickEventTB, LeadEventTB } from "@/lib/types";
import { eventsFilterTB } from "@/lib/zod/schemas/analytics";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { createCommissionSchema } from "@/lib/zod/schemas/commissions";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { COUNTRIES_TO_CONTINENTS } from "@dub/utils/src";
import { WorkflowTrigger } from "@prisma/client";
import { waitUntil } from "@vercel/functions";
import { z } from "zod";
import { authActionClient } from "../safe-action";

// TODO: if eventIds is provided + existing customer partnerId is different from provided partnerId
// create a new customer
// duplicate the event IDs

export const createManualCommissionAction = authActionClient
  .schema(createCommissionSchema)
  .action(async ({ parsedInput, ctx }) => {
    const { workspace, user } = ctx;

    const {
      partnerId,
      date,
      amount,
      linkId,
      invoiceId,
      productId,
      customerId,
      saleAmount,
      saleEventDate,
      leadEventDate,
      leadEventName,
      description,
      eventIds,
    } = parsedInput;

    const programId = getDefaultProgramIdOrThrow(workspace);

    const [{ partner, links }, customer] = await Promise.all([
      getProgramEnrollmentOrThrow({
        programId,
        partnerId,
        includePartner: true,
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
      const dummyRequest = new Request(link.url, {
        headers: new Headers({
          "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          "x-forwarded-for": "127.0.0.1",
          ...(customer.country
            ? {
                "x-vercel-ip-country": customer.country.toUpperCase(),
                "x-vercel-ip-continent":
                  COUNTRIES_TO_CONTINENTS[customer.country.toUpperCase()],
              }
            : {
                "x-vercel-ip-country": "US",
                "x-vercel-ip-country-region": "CA",
                "x-vercel-ip-continent": "NA",
              }),
        }),
      });

      const finalLeadEventDate = leadEventDate ?? saleEventDate ?? new Date();

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

      clickEvent = clickEventSchemaTB.parse({
        ...clickData,
        bot: 0,
        qr: 0,
      });
      const leadEventId = nanoid(16);
      leadEvent = leadEventSchemaTB.parse({
        ...clickEvent,
        event_id: leadEventId,
        event_name: leadEventName || "Sign up",
        customer_id: customerId,
      });

      shouldUpdateCustomer = !customer.linkId && clickData ? true : false;

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

        executeWorkflows({
          trigger: WorkflowTrigger.leadRecorded,
          programId,
          partnerId,
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
          metadata: productId ? JSON.stringify({ productId }) : undefined,
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
            sale: {
              productId,
            },
          },
        }),

        executeWorkflows({
          trigger: WorkflowTrigger.saleRecorded,
          programId,
          partnerId,
        }),
      ]);
    }

    // Duplicate the customer events
    const shouldDuplicateEvents =
      eventIds && eventIds.length > 0 && customer.linkId !== linkId;

    if (shouldDuplicateEvents) {
      const eventType = !saleAmount ? "leads" : "sales";

      // Find the events by the eventIds
      const { startDate, endDate } = getStartEndDates({
        interval: "all",
      });

      const pipe = tb.buildPipe({
        pipe: "v2_events",
        parameters: eventsFilterTB,
        data: z.any(),
      });

      const response = await pipe({
        workspaceId: workspace.id,
        eventType,
        sortBy: "timestamp",
        offset: 0,
        limit: 100,
        start: startDate.toISOString().replace("T", " ").replace("Z", ""),
        end: endDate.toISOString().replace("T", " ").replace("Z", ""),
        eventIds,
      });

      const events = response.data;

      if (events.length === 0) {
        throw new Error("Selected events not found.");
      }

      

      // Duplicate the events for the new customer
      if (eventType === "leads") {
        await Promise.all(
          events.map((event) =>
            recordLeadWithTimestamp({
              ...event,
              customer_id: customerId, // TODO: should be new customerId
              link_id: link.id,
            }),
          ),
        );
      } else if (eventType === "sales") {
        await Promise.all(
          events.map((event) =>
            recordSaleWithTimestamp({
              ...event,
              customer_id: customerId, // TODO: should be new customerId
              link_id: link.id,
            }),
          ),
        );
      }

      console.log(events);
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
