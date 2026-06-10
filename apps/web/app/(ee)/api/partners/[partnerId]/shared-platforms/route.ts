import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { getProgramEnrollmentOrThrow } from "@/lib/api/programs/get-program-enrollment-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnerSharedPlatformSchema } from "@/lib/zod/schemas/partners";
import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { getDomainWithoutWWW } from "@dub/utils";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

// GET /api/partners/:partnerId/shared-platforms – other partners in the program with the same verified platform identifiers
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { partnerId } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const { partner } = await getProgramEnrollmentOrThrow({
      partnerId,
      programId,
      include: {
        partner: {
          include: {
            platforms: true,
          },
        },
      },
    });

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
            type: platform.type,
            identifier: {
              contains: websiteDomain,
            },
          });
        }
        continue;
      }

      matchConditions.push({
        type: platform.type,
        identifier: platform.identifier,
      });
    }

    if (matchConditions.length === 0) {
      return NextResponse.json([]);
    }

    const sharedPlatformMatches = await prisma.partnerPlatform.findMany({
      where: {
        partnerId: {
          not: partner.id,
        },
        verifiedAt: {
          not: null,
        },
        OR: matchConditions,
        partner: {
          programs: {
            some: {
              programId,
            },
          },
        },
      },
      include: {
        partner: {
          select: {
            id: true,
            name: true,
            image: true,
            programs: {
              where: {
                programId,
              },
              select: {
                status: true,
              },
            },
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
          partners: platformMatches
            .filter((match) => match.partner.programs.length > 0)
            .map((match) => ({
              id: match.partner.id,
              name: match.partner.name,
              image: match.partner.image,
              status: match.partner.programs[0].status,
            })),
        };
      })
      .filter((platform) => platform.partners.length > 0);

    return NextResponse.json(
      z.array(partnerSharedPlatformSchema).parse(sharedPlatforms),
    );
  },
  {
    requiredPlan: [
      "business",
      "business plus",
      "business extra",
      "business max",
      "advanced",
      "enterprise",
    ],
  },
);
