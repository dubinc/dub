import { getCustomerEvents } from "@/lib/analytics/get-customer-events";
import { getCustomerOrThrow } from "@/lib/api/customers/get-customer-or-throw";
import { decodeLinkIfCaseSensitive } from "@/lib/api/links/case-sensitivity";
import { withWorkspace } from "@/lib/auth";
import { customerActivityResponseSchema } from "@/lib/zod/schemas/customer-activity";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/customers/[id]/activity - get a customer's activity
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { id: customerId } = params;

  const customer = await getCustomerOrThrow({
    workspaceId: workspace.id,
    id: customerId,
  });

  const events = await getCustomerEvents({
    customerId: customer.id,
  });

  // get the first partner link that this customer interacted with
  const firstLinkId =
    events.length > 0 ? events[events.length - 1].link_id : customer.linkId;

  let link: {
    id: string;
    domain: string;
    key: string;
    shortLink: string;
  } | null = null;

  if (firstLinkId) {
    link = await prisma.link.findUniqueOrThrow({
      where: {
        id: firstLinkId,
      },
      select: {
        id: true,
        domain: true,
        key: true,
        shortLink: true,
      },
    });

    link = decodeLinkIfCaseSensitive(link);
  }

  return NextResponse.json(
    customerActivityResponseSchema.parse({
      ...customer,
      events,
      link,
    }),
  );
});
