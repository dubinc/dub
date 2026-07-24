import { prisma } from "@/lib/prisma";
import { getDomainWithoutWWW } from "@dub/utils";
import {
  Partner,
  PartnerPlatform,
  Prisma,
  ProgramEnrollmentStatus,
} from "@prisma/client";

type SharedPlatformMatch = PartnerPlatform & {
  partner: Pick<Partner, "id" | "name" | "email" | "image"> & {
    // only selected when programId is provided
    programs?: { status: ProgramEnrollmentStatus }[];
  };
};

// Finds other partners with the same verified platform identifiers.
// When programId is provided, only matches partners enrolled in that program
// and includes each matched partner's enrollment status.
export async function getSharedPartnerPlatforms({
  partnerId,
  programId,
}: {
  partnerId: string;
  programId?: string;
}) {
  const partner = await prisma.partner.findUnique({
    where: { id: partnerId },
    include: {
      platforms: true,
    },
  });

  if (!partner) {
    return null;
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

  const exactMatchConditions: Prisma.PartnerPlatformWhereInput[] = [];
  let websiteMatchCondition: Prisma.PartnerPlatformWhereInput | null = null;

  for (const platform of verifiedPlatforms) {
    if (platform.type === "website") {
      // website identifiers are full URLs with inconsistent normalization,
      // so match on the domain instead of the exact identifier
      if (websiteDomain) {
        websiteMatchCondition = {
          identifier: {
            contains: websiteDomain,
          },
          type: platform.type,
        };
      }
      continue;
    }

    exactMatchConditions.push({
      identifier: platform.identifier,
      type: platform.type,
    });
  }

  if (exactMatchConditions.length === 0 && !websiteMatchCondition) {
    return [];
  }

  const partnerInclude = {
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      ...(programId && {
        programs: {
          where: {
            programId,
          },
          select: {
            status: true,
          },
        },
      }),
    },
  } satisfies Prisma.PartnerPlatformInclude["partner"];

  const baseWhere = {
    partnerId: {
      not: partner.id,
    },
    verifiedAt: {
      not: null,
    },
    ...(programId && {
      partner: {
        programs: {
          some: {
            programId,
          },
        },
      },
    }),
  } satisfies Prisma.PartnerPlatformWhereInput;

  const matchQueries: Promise<SharedPlatformMatch[]>[] = [];

  if (exactMatchConditions.length > 0) {
    matchQueries.push(
      prisma.partnerPlatform.findMany({
        where: {
          OR: exactMatchConditions,
          ...baseWhere,
        },
        include: {
          partner: partnerInclude,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 10 * exactMatchConditions.length,
      }) as Promise<SharedPlatformMatch[]>,
    );
  }

  if (websiteMatchCondition) {
    matchQueries.push(
      prisma.partnerPlatform.findMany({
        where: {
          ...websiteMatchCondition,
          ...baseWhere,
        },
        include: {
          partner: partnerInclude,
        },
        orderBy: {
          createdAt: "asc",
        },
        take: 100,
      }) as Promise<SharedPlatformMatch[]>,
    );
  }

  const sharedPlatformMatches = (await Promise.all(matchQueries)).flat();

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

      const partners = platformMatches
        .flatMap((match) => {
          const status = programId
            ? match.partner.programs?.[0]?.status
            : undefined;

          if (programId && !status) {
            return [];
          }

          return [
            {
              id: match.partner.id,
              name: match.partner.name,
              email: match.partner.email,
              image: match.partner.image,
              ...(status && { status }),
            },
          ];
        })
        .slice(0, 10);

      return {
        type: platform.type,
        identifier: platform.identifier,
        partners,
      };
    })
    .filter((platform) => platform.partners.length > 0);

  return sharedPlatforms;
}
