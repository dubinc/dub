import { getEvents } from "@/lib/analytics/get-events";
import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { generateRandomName } from "@/lib/names";
import {
  partnerProfileEventsQuerySchema,
  PartnerProfileLinkSchema,
} from "@/lib/zod/schemas/partner-profile";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";

const querySchema = partnerProfileEventsQuerySchema.pick({
  event: true,
  start: true,
  end: true,
  saleType: true,
  limit: true,
  page: true,
  sortBy: true,
});

// GET /api/embed/referrals/events – get paginated events for a partner
export const GET = withReferralsEmbedToken(
  async ({ links, program, programEnrollment, searchParams }) => {
    if (links.length === 0) {
      return NextResponse.json([]);
    }

    const parsedQuery = querySchema.parse(searchParams);

    const events = await getEvents({
      ...parsedQuery,
      workspaceId: program.workspaceId,
      linkId: parseFilterValue(links.map((link) => link.id)),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    const response = events.map((event) => {
      const {
        ip: _eventIp,
        click,
        customer,
        ...eventRest
      } = event as typeof event & {
        ip?: unknown;
        customer?: { id: string; email?: string | null; name?: string | null };
      };
      const { ip: _, ...clickRest } = click;

      return {
        ...eventRest,
        click: clickRest,
        link: event?.link ? PartnerProfileLinkSchema.parse(event.link) : null,
        ...(customer && {
          customer: {
            id: customer.id,
            email: customer.email
              ? programEnrollment.customerDataSharingEnabledAt
                ? customer.email
                : obfuscateCustomerEmail(customer.email)
              : customer.name || generateRandomName(),
          },
        }),
      };
    });

    return NextResponse.json(response);
  },
);
