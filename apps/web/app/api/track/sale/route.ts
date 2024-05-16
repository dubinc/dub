import { DubApiError } from "@/lib/api/errors";
import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { prismaEdge } from "@/lib/prisma/edge";
import { getLeadEvent, recordSale } from "@/lib/tinybird";
import { clickEventSchemaTB } from "@/lib/zod/schemas/clicks";
import { trackSaleRequestSchema } from "@/lib/zod/schemas/sales";
import { nanoid } from "@dub/utils";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/sale – Track a sale conversion event
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
    const {
      customerId: externalId,
      paymentProcessor,
      invoiceId,
      amount,
      currency,
      metadata,
    } = trackSaleRequestSchema.parse(await parseRequestBody(req));

    // Find customer
    const customer = await prismaEdge.customer.findUnique({
      where: {
        projectId_externalId: {
          projectId: workspace.id,
          externalId,
        },
      },
    });

    if (!customer) {
      throw new DubApiError({
        code: "not_found",
        message: `Customer not found for externalId: ${externalId}`,
      });
    }

    // Find lead
    const leadEvent = await getLeadEvent({ customerId: customer.id });

    if (!leadEvent || leadEvent.data.length === 0) {
      throw new DubApiError({
        code: "not_found",
        message: `Lead event not found for customerId: ${customer.id}`,
      });
    }

    const clickData = clickEventSchemaTB
      .omit({ timestamp: true })
      .parse(leadEvent.data[0]);

    await recordSale({
      ...clickData,
      customer_id: customer.id,
      event_id: nanoid(16),
      payment_processor: paymentProcessor,
      invoice_id: invoiceId,
      amount,
      currency,
      metadata: metadata ? JSON.stringify(metadata) : "",
    });

    return NextResponse.json({ success: true });
  },
  { betaFeature: true },
);
