import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { createSaleData } from "@/lib/api/sales/create-sale-data";
import { createId } from "@/lib/api/utils";
import { generateRandomName } from "@/lib/names";
import {
  getClickEvent,
  getLeadEvent,
  recordLead,
  recordSale,
} from "@/lib/tinybird";
import z from "@/lib/zod";
import { leadEventSchemaTB } from "@/lib/zod/schemas/leads";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { orderSchema } from "./schema";

async function createLead({
  clickId,
  externalId,
  workspaceId,
}: {
  clickId: string;
  externalId: string;
  workspaceId: string;
}) {
  // find click
  const clickEvent = await getClickEvent({ clickId });

  const clickData = clickEvent.data[0];
  const { link_id: linkId, country, timestamp } = clickData;

  // create customer
  const customer = await prisma.customer.create({
    data: {
      id: createId({ prefix: "cus_" }),
      name: generateRandomName(),
      externalId,
      projectId: workspaceId,
      clickedAt: new Date(timestamp + "Z"),
      clickId,
      linkId,
      country,
    },
  });

  const leadData = leadEventSchemaTB.parse({
    ...clickData,
    event_id: nanoid(16),
    event_name: "Account created",
    customer_id: customer.id,
  });

  await Promise.all([
    // record lead
    recordLead(leadData),

    // update link leads count
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        leads: {
          increment: 1,
        },
      },
    }),

    // update workspace usage
    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        usage: {
          increment: 1,
        },
      },
    }),
  ]);

  return leadData;
}

async function createSale({
  order,
  customerId,
  workspaceId,
  leadData,
}: {
  order: any;
  customerId: string;
  workspaceId: string;
  leadData: z.infer<typeof leadEventSchemaTB>;
}) {
  const orderData = orderSchema.parse(order);
  const eventId = nanoid(16);
  const paymentProcessor = "shopify";

  const amount = Number(orderData.total_price) * 100;
  const currency = orderData.currency;
  const invoiceId = orderData.confirmation_number;

  const { link_id: linkId, click_id: clickId } = leadData;

  const sale = await prisma.sale.findFirst({
    where: {
      invoiceId,
      clickId,
    },
  });

  if (sale) {
    return new Response(
      `[Shopify] Order has been processed already. Skipping...`,
    );
  }

  const saleData = {
    ...leadData,
    event_id: eventId,
    event_name: "Purchase",
    payment_processor: paymentProcessor,
    amount,
    currency,
    invoice_id: invoiceId,
    metadata: JSON.stringify(order),
  };

  const [_sale, link, _project] = await Promise.all([
    // record sale
    recordSale(saleData),

    // update link sales count
    prisma.link.update({
      where: {
        id: linkId,
      },
      data: {
        sales: {
          increment: 1,
        },
        saleAmount: {
          increment: amount,
        },
      },
    }),

    // update workspace sales usage
    prisma.project.update({
      where: {
        id: workspaceId,
      },
      data: {
        usage: {
          increment: 1,
        },
        salesUsage: {
          increment: amount,
        },
      },
    }),
  ]);

  // for program links
  if (link.programId) {
    const { program, partnerId, commissionAmount } =
      await prisma.programEnrollment.findUniqueOrThrow({
        where: {
          linkId,
        },
        select: {
          program: true,
          partnerId: true,
          commissionAmount: true,
        },
      });

    const saleRecord = createSaleData({
      program,
      partner: {
        id: partnerId,
        commissionAmount,
      },
      customer: {
        id: customerId,
        linkId,
        clickId,
      },
      sale: {
        amount,
        currency,
        invoiceId,
        eventId,
        paymentProcessor,
      },
      metadata: {
        ...order,
      },
    });

    await Promise.allSettled([
      prisma.sale.create({
        data: saleRecord,
      }),

      notifyPartnerSale({
        partner: {
          id: partnerId,
          referralLink: link.shortLink,
        },
        program,
        sale: {
          amount: saleRecord.amount,
          earnings: saleRecord.earnings,
        },
      }),
    ]);
  }
}

// Process the order from Shopify webhook
export async function processOrder({
  event,
  workspaceId,
  customerId,
  clickId,
}: {
  event: unknown;
  workspaceId: string;
  customerId?: string; // ID of the customer in Dub
  clickId?: string; // ID of the click event from Shopify pixel
}) {
  try {
    const order = orderSchema.parse(event);

    // for existing customer
    if (customerId) {
      const leadEvent = await getLeadEvent({ customerId });

      if (!leadEvent || leadEvent.data.length === 0) {
        return new Response(
          `[Shopify] Lead event with customer ID ${customerId} not found, skipping...`,
        );
      }

      const leadData = leadEvent.data[0];

      await createSale({
        leadData,
        order,
        workspaceId,
        customerId,
      });

      return;
    }

    // for new customer
    if (clickId) {
      const {
        customer: { id: externalId },
      } = orderSchema.parse(event);

      const leadData = await createLead({
        clickId,
        workspaceId,
        externalId: externalId.toString(),
      });

      const { customer_id: customerId } = leadData;

      await createSale({
        leadData,
        order,
        workspaceId,
        customerId,
      });
    }

    return new Response("[Shopify] Order event processed successfully.");
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
