import { getEvents } from "@/lib/analytics/get-events";
import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { withReferralsEmbedToken } from "@/lib/embed/referrals/auth";
import { generateRandomName } from "@/lib/names";
import { nullifyPartnerEventRevenue } from "@/lib/partners/hide-partner-revenue";
import { isPartnerRevenueHidden } from "@/lib/partners/is-partner-revenue-hidden";
import {
  partnerProfileEventsQuerySchema,
  PartnerProfileLinkSchema,
} from "@/lib/zod/schemas/partner-profile";
import { parseFilterValue } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

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
  async ({ links, program, programEnrollment, group, searchParams }) => {
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

    const { customerDataSharingEnabledAt } = programEnrollment;
    const hidePartnerRevenue = isPartnerRevenueHidden(group);

    const response = events.map((event) => {
      // don't return ip address for partner profile
      // @ts-ignore – ip is deprecated but present in the data
      const { ip, click, customer, ...eventRest } = event;
      const { ip: _, ...clickRest } = click;

      const mapped = {
        ...eventRest,
        click: clickRest,
        // the embed token comes from the workspace, so no private partner link details
        link: event?.link ? PartnerProfileLinkSchema.parse(event.link) : null,
        ...(customer && {
          customer: z
            .object({
              id: z.string(),
              email: z.string(),
              ...(customerDataSharingEnabledAt && { name: z.string() }),
            })
            .parse({
              ...customer,
              email: customer.email
                ? customerDataSharingEnabledAt
                  ? customer.email
                  : obfuscateCustomerEmail(customer.email)
                : customer.name || generateRandomName(),
              ...(customerDataSharingEnabledAt && {
                name: customer.name || generateRandomName(),
              }),
            }),
        }),
      };

      return hidePartnerRevenue ? nullifyPartnerEventRevenue(mapped) : mapped;
    });

    return NextResponse.json(response);
  },
);
