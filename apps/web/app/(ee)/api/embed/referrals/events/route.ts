import { getEvents } from "@/lib/analytics/get-events";
import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { generateRandomName } from "@/lib/names";
import { PartnerProfileLinkSchema } from "@/lib/zod/schemas/partner-profile";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z.object({
  event: z.enum(["leads", "sales"]).default("leads"),
  start: z.string().optional(),
  end: z.string().optional(),
  saleType: z.enum(["new", "recurring"]).optional(),
  limit: z.coerce.number().int().positive().max(100).default(10),
  page: z.coerce.number().int().positive().default(1),
});

// GET /api/embed/referrals/events – get paginated events for a partner
export const GET = withReferralsEmbedToken(
  async ({ links, program, programEnrollment, searchParams }) => {
    if (links.length === 0) {
      return NextResponse.json([]);
    }

    const parsed = querySchema.parse(searchParams);

    const events = await getEvents({
      event: parsed.event,
      ...(parsed.start && { start: new Date(parsed.start) }),
      ...(parsed.end && { end: new Date(parsed.end) }),
      ...(parsed.saleType && { saleType: parsed.saleType }),
      limit: parsed.limit,
      page: parsed.page,
      sortBy: "timestamp",
      workspaceId: program.workspaceId,
      linkId: parseFilterValue(links.map((link) => link.id)),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    const response = events.map((event) => {
      // @ts-ignore – ip is deprecated but present in the data
      const { ip, click, customer, ...eventRest } = event;
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
