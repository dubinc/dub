import { parseRequestBody } from "@/lib/api/utils";
import { withSessionEdge } from "@/lib/auth/session-edge";
import { recordCustomer } from "@/lib/tinybird";
import { trackCustomerRequestSchema } from "@/lib/zod/schemas/customers";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/customer – Track a customer object
export const POST = withSessionEdge(async ({ req }) => {
  const {
    customerId,
    customerName,
    customerEmail,
    customerAvatar,
    workspaceId,
  } = trackCustomerRequestSchema.parse(await parseRequestBody(req));

  waitUntil(
    recordCustomer({
      timestamp: new Date(Date.now()).toISOString(),
      customer_id: customerId,
      name: customerName,
      email: customerEmail,
      avatar: customerAvatar,
      workspace_id: workspaceId,
    }),
  );

  return NextResponse.json({ success: true });
});
