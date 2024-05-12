import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspace } from "@/lib/auth";
import { recordCustomer } from "@/lib/tinybird";
import { trackCustomerRequestSchema } from "@/lib/zod/schemas";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

// POST /api/track/customer – Track a customer object
export const POST = withWorkspace(async ({ req, workspace }) => {
  const { customerId, customerName, customerEmail, customerAvatar } =
    trackCustomerRequestSchema.parse(await parseRequestBody(req));

  waitUntil(
    recordCustomer({
      customer_id: customerId,
      name: customerName,
      email: customerEmail,
      avatar: customerAvatar,
      workspace_id: workspace.id,
    }),
  );

  return NextResponse.json({ success: true });
});
