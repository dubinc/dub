import { parseRequestBody } from "@/lib/api/utils";
import { withWorkspaceEdge } from "@/lib/auth/workspace-edge";
import { recordCustomer } from "@/lib/tinybird";
import { trackCustomerRequestSchema } from "@/lib/zod/schemas";
import { waitUntil } from "@vercel/functions";
import { NextResponse } from "next/server";

export const runtime = "edge";

// POST /api/track/customer – Track a customer object
export const POST = withWorkspaceEdge(
  async ({ req, workspace }) => {
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
  },
  { betaFeature: true },
);
