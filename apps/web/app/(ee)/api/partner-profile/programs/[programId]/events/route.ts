import { getEvents } from "@/lib/analytics/get-events";
import { DubApiError } from "@/lib/api/errors";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { generateRandomName } from "@/lib/names";
import {
  PartnerProfileLinkSchema,
  partnerProfileEventsQuerySchema,
} from "@/lib/zod/schemas/partner-profile";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/partner-profile/programs/[programId]/events – get events for a program enrollment link
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program, customerDataSharingEnabledAt } =
      await getProgramEnrollmentOrThrow({
        partnerId: partner.id,
        programId: params.programId,
        include: {
          program: true,
        },
      });

    if (program.id === "prog_1K0QHV7MP3PR05CJSCF5VN93X") {
      throw new DubApiError({
        code: "forbidden",
        message: "This feature is not available for your program.",
      });
    }

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
      dataAvailableFrom: program.startedAt ?? program.createdAt,
    });

    const response = events.map((event) => {
      // don't return ip address for partner profile
      // @ts-ignore – ip is deprecated but present in the data
      const { ip, click, customer, ...eventRest } = event;
      const { ip: _, ...clickRest } = click;

      return {
        ...eventRest,
        click: clickRest,
        link: event?.link ? PartnerProfileLinkSchema.parse(event.link) : null,
        ...(customer && {
          customer: z
            .object({
              id: z.string(),
              email: z.string(),
            })
            .parse({
              ...customer,
              email: customer.email
                ? customerDataSharingEnabledAt
                  ? customer.email
                  : customer.email.replace(/(?<=^.).+(?=.@)/, "****")
                : customer.name || generateRandomName(),
            }),
        }),
      };
    });

    return NextResponse.json(response);
  },
);
