import { getFirstFilterValue } from "@/lib/analytics/filter-helpers";
import { getEvents } from "@/lib/analytics/get-events";
import { DubApiError } from "@/lib/api/errors";
import { obfuscateCustomerEmail } from "@/lib/api/partner-profile/obfuscate-customer-email";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  LARGE_PROGRAM_IDS,
  LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS,
  MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING,
} from "@/lib/constants/partner-profile";
import { generateRandomName } from "@/lib/names";
import { nullifyPartnerEventRevenue } from "@/lib/partners/hide-partner-revenue";
import { isPartnerRevenueHidden } from "@/lib/partners/is-partner-revenue-hidden";
import {
  parsePartnerProfileEventLink,
  partnerProfileEventsQuerySchema,
} from "@/lib/zod/schemas/partner-profile";
import { parseFilterValue, toCentsNumber } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partner-profile/programs/[programId]/events – get events for a program enrollment link
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const {
      program,
      links,
      totalCommissions,
      customerDataSharingEnabledAt,
      partnerGroup,
    } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
      include: {
        program: {
          select: {
            id: true,
            workspaceId: true,
            startedAt: true,
            createdAt: true,
          },
        },
        links: {
          select: {
            id: true,
            domain: true,
            key: true,
            partnerLinkDetails: {
              select: {
                title: true,
                comments: true,
              },
            },
          },
        },
        partnerGroup: {
          select: {
            revenueDataSharingDisabledAt: true,
          },
        },
      },
    });

    if (
      LARGE_PROGRAM_IDS.includes(program.id) &&
      toCentsNumber(totalCommissions) <
        LARGE_PROGRAM_MIN_TOTAL_COMMISSIONS_CENTS
    ) {
      throw new DubApiError({
        code: "forbidden",
        message: "This feature is not available for your program.",
      });
    }

    // early return if partner has no links
    if (links.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    const parsedParams = partnerProfileEventsQuerySchema.parse(searchParams);
    const { linkId, domain, key } = parsedParams;

    if (linkId) {
      // check to make sure all of the linkId.values are in the links
      if (
        !linkId.values.every((value) => links.some((link) => link.id === value))
      ) {
        throw new DubApiError({
          code: "not_found",
          message: "One or more links are not found",
        });
      }

      if (linkId.sqlOperator === "NOT IN") {
        // if using NOT IN operator, we need to include all links except the ones in the linkId.values
        const finalIncludedLinkIds = links
          .filter((link) => !linkId.values.includes(link.id))
          .map((link) => link.id);

        // early return if no links are left
        if (finalIncludedLinkIds.length === 0) {
          return NextResponse.json([], { status: 200 });
        }

        parsedParams.linkId = {
          operator: "IS",
          sqlOperator: "IN",
          values: finalIncludedLinkIds,
        };
      }
    } else if (domain && key) {
      const link = links.find(
        (link) =>
          link.domain === getFirstFilterValue(domain) && link.key === key,
      );
      if (!link) {
        throw new DubApiError({
          code: "not_found",
          message: "Link not found",
        });
      }

      parsedParams.linkId = {
        operator: "IS",
        sqlOperator: "IN",
        values: [link.id],
      };
    }

    const events = await getEvents({
      ...parsedParams,
      workspaceId: program.workspaceId,
      includeMetadata: false,
      ...(parsedParams.linkId
        ? { linkId: parsedParams.linkId }
        : links.length > MAX_PARTNER_LINKS_FOR_LOCAL_FILTERING
          ? { partnerId: partner.id }
          : { linkId: parseFilterValue(links.map((link) => link.id)) }),
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    const hidePartnerRevenue = isPartnerRevenueHidden(partnerGroup);

    const response = events.map((event) => {
      // don't return ip address for partner profile
      // @ts-ignore – ip is deprecated but present in the data
      const { ip, click, customer, ...eventRest } = event;
      const { ip: _, ...clickRest } = click;

      const mapped = {
        ...eventRest,
        click: clickRest,
        link: event?.link
          ? parsePartnerProfileEventLink(event.link, links)
          : null,
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
