import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { notifyPartnerSale } from "@/lib/api/partners/notify-partner-sale";
import { createSaleData } from "@/lib/api/sales/sale";
import { createId } from "@/lib/api/utils";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { generateRandomName } from "@/lib/names";
import { getClickEvent, recordLead, recordSale } from "@/lib/tinybird";
import { redis } from "@/lib/upstash";
import z from "@/lib/zod";
import { prisma } from "@dub/prisma";
import { nanoid } from "@dub/utils";
import { Customer } from "@prisma/client";

export const dynamic = "force-dynamic";

const schema = z.object({
  clickId: z.string(),
  checkoutToken: z.string(),
});

const checkoutSchema = z.object({
  customer: z.object({
    id: z.number(),
  }), // TODO: Test this with guest checkout
  total_price: z.string(),
  currency: z.string(),
  confirmation_number: z.string(),
});

const workspace = {
  id: "cl7pj5kq4006835rbjlt2ofka",
};

// POST /api/cron/shopify/checkout-completed
export async function POST(req: Request) {
  try {
    const body = await req.json();
    await verifyQstashSignature(req, body);

    const { clickId, checkoutToken } = schema.parse(body);

    // upstash-retried header
    // console.log("Request headers", req.headers);

    // Find click event
    const clickEvent = await getClickEvent({ clickId });

    if (!clickEvent || clickEvent.data.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: `Click event not found for clickId: ${clickId}`,
      });
    }

    // Find Shopify order
    const order = await redis.get(`shopify:checkout:${checkoutToken}`);

    if (!order) {
      throw new DubApiError({
        code: "bad_request",
        message: "Shopify order not found. Waiting for order...",
      });
    }

    const parsedOrder = checkoutSchema.parse(order);
    const customerExternalId = parsedOrder.customer.id.toString();

    // Fetch or create customer
    let customer: Customer | null = await prisma.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId: customerExternalId,
        },
      },
    });

    const clickData = clickEvent.data[0];
    const { link_id: linkId, country, timestamp } = clickData;

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          id: createId({ prefix: "cus_" }),
          name: generateRandomName(),
          externalId: customerExternalId,
          projectId: workspace.id,
          clickedAt: new Date(timestamp + "Z"),
          clickId,
          linkId,
          country,
        },
      });

      await Promise.all([
        // record lead
        recordLead({
          ...clickData,
          event_id: nanoid(16),
          event_name: "Account created",
          customer_id: customer.id,
        }),

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
            id: workspace.id,
          },
          data: {
            usage: {
              increment: 1,
            },
          },
        }),
      ]);
    }

    const amount = Number(parsedOrder.total_price);
    const currency = parsedOrder.currency;
    const invoiceId = parsedOrder.confirmation_number;

    const eventId = nanoid(16);
    const paymentProcessor = "shopify";

    const [_sale, link, _project] = await Promise.all([
      // record sale
      recordSale({
        ...clickData,
        event_id: eventId,
        event_name: "Purchase",
        customer_id: customer.id,
        payment_processor: paymentProcessor,
        amount,
        currency,
        invoice_id: invoiceId,
        metadata: JSON.stringify({
          parsedOrder,
        }),
      }),

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
          id: workspace.id,
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
      const { program, partner } =
        await prisma.programEnrollment.findUniqueOrThrow({
          where: {
            linkId: link.id,
          },
          select: {
            program: true,
            partner: {
              select: {
                id: true,
              },
            },
          },
        });

      const saleRecord = createSaleData({
        customerId: customer.id,
        linkId: link.id,
        clickId: clickData.click_id,
        invoiceId,
        eventId,
        paymentProcessor,
        amount,
        currency,
        partnerId: partner.id,
        program,
        metadata: clickData,
      });

      await Promise.allSettled([
        prisma.sale.create({
          data: saleRecord,
        }),

        notifyPartnerSale({
          partner: {
            id: partner.id,
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

    // TODO:
    // Send webhook event

    await redis.del(`shopify:checkout:${checkoutToken}`);

    return new Response("Shopify order tracked.", { status: 200 });
  } catch (error) {
    return handleAndReturnErrorResponse(error);
  }
}
