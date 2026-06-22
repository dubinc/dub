import { withAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { partnerSharedPlatformSchema } from "@/lib/zod/schemas/partners";
import { getDomainWithoutWWW } from "@dub/utils";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/admin/partners/:partnerId/shared-platforms – other partners in the network with the same verified platform identifiers
export const GET = withAdmin(async ({ params }) => {
  const { partnerId } = params;

  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      platforms: true,
    },
  });

  if (!partner) {
    return new Response("Partner not found.", { status: 404 });
  }
  const verifiedPlatforms = partner.platforms.filter(
    (platform) => platform.verifiedAt !== null,
  );

  // a partner has at most one platform per type, so there is at most one website
  const websitePlatform = verifiedPlatforms.find(
    (platform) => platform.type === "website",
  );

  const websiteDomain = websitePlatform
    ? getDomainWithoutWWW(websitePlatform.identifier) ?? null
    : null;

  const matchConditions: Prisma.PartnerPlatformWhereInput[] = [];

  for (const platform of verifiedPlatforms) {
    if (platform.type === "website") {
      // website identifiers are full URLs with inconsistent normalization,
      // so match on the domain instead of the exact identifier
      if (websiteDomain) {
        matchConditions.push({
          identifier: {
            contains: websiteDomain,
          },
          type: platform.type,
        });
      }
      continue;
    }

    matchConditions.push({
      identifier: platform.identifier,
      type: platform.type,
    });
  }

  if (matchConditions.length === 0) {
    return NextResponse.json([]);
  }

  const sharedPlatformMatches = await prisma.partnerPlatform.findMany({
    where: {
      OR: matchConditions,
      partnerId: {
        not: partner.id,
      },
      verifiedAt: {
        not: null,
      },
    },
    include: {
      partner: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 10,
  });

  const sharedPlatforms = verifiedPlatforms
    .map((platform) => {
      let platformMatches = sharedPlatformMatches.filter(
        (match) => match.type === platform.type,
      );

      // "contains" matches on the domain need exact verification
      // (e.g. contains "example.com" would also match "notexample.com")
      if (platform.type === "website") {
        platformMatches = platformMatches.filter(
          (match) =>
            websiteDomain !== null &&
            getDomainWithoutWWW(match.identifier) === websiteDomain,
        );
      }

      return {
        type: platform.type,
        identifier: platform.identifier,
        partners: platformMatches.map((match) => ({
          id: match.partner.id,
          name: match.partner.name,
          email: match.partner.email,
          image: match.partner.image,
        })),
      };
    })
    .filter((platform) => platform.partners.length > 0);

  return NextResponse.json(
    z.array(partnerSharedPlatformSchema).parse(sharedPlatforms),
  );
});
