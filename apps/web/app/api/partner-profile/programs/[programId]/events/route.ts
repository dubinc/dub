import { getEvents } from "@/lib/analytics/get-events";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withPartnerProfile } from "@/lib/auth/partner";
import { eventsQuerySchema } from "@/lib/zod/schemas/analytics";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/partner-profile/programs/[programId]/events – get events for a program enrollment link
export const GET = withPartnerProfile(
  async ({ partner, params, searchParams }) => {
    const { program } = await getProgramEnrollmentOrThrow({
      partnerId: partner.id,
      programId: params.programId,
    });

    const parsedParams = eventsQuerySchema
      .omit({
        workspaceId: true,
        externalId: true,
        tenantId: true,
      })
      .parse(searchParams);

    let { linkId, domain, key, ...rest } = parsedParams;

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

    const response = await getEvents({
      programId: program.id,
      partnerId: partner.id,
      linkId,
      ...rest,
      dataAvailableFrom: program.createdAt,
    });

    // TODO:
    // Customer email should be masked

    console.log(response);

    return NextResponse.json(response);
  },
);
