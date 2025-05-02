import { getEvents } from "@/lib/analytics/get-events";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import {
  PartnerProfileLinkSchema,
  partnerProfileEventsQuerySchema,
} from "@/lib/zod/schemas/partner-profile";

import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const CustomerSchema = z.object({
  id: z.string(),
  email: z
    .string()
    .transform((email) => email.replace(/(?<=^.).+(?=.@)/, "****")),
});

// GET /api/partner-profile/programs/[programId]/events – get events for a program enrollment link
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    let { linkId, domain, key, ...rest } =
      partnerProfileEventsQuerySchema.parse(searchParams);

    if (!linkId && domain && key) {
      const link = await prisma.link.findUnique({
        where: {
          domain_key: {
            domain,
            key,
          },
        },
      });

      if (!link || link.partnerId !== partner.id) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      linkId = link.id;
    }

    const events = await getEvents({
      ...rest,
      linkId,
      programId: program.id,
      partnerId: partner.id,
      dataAvailableFrom: program.createdAt,
    });

    const response = events.map((event) => {
      // don't return ip address for partner profile
      // @ts-ignore – ip is deprecated but present in the data
      const { ip, click, ...eventRest } = event;
      const { ip: _, ...clickRest } = click;

      return {
        ...eventRest,
        click: clickRest,
        link: event?.link ? PartnerProfileLinkSchema.parse(event.link) : null,
        // @ts-expect-error - customer is not always present
        ...(event?.customer && {
          customer: CustomerSchema
            // @ts-expect-error - customer is not always present
            .parse(event.customer),
        }),
      };
    });

    return NextResponse.json(response);
  },
);
