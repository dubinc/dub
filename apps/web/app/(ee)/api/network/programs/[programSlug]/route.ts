import { DubApiError } from "@/lib/api/errors";
import { withPartnerProfile } from "@/lib/auth/partner";
import { DEFAULT_PARTNER_GROUP } from "@/lib/zod/schemas/groups";
import { programLanderSchema } from "@/lib/zod/schemas/program-lander";
import { NetworkProgramExtendedSchema } from "@/lib/zod/schemas/program-network";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { checkProgramNetworkRequirements } from "../check-program-network-requirements";

// GET /api/network/programs/[programSlug] - get a program in the network by slug
export const GET = withPartnerProfile(async ({ partner, params }) => {
  if (!(await checkProgramNetworkRequirements({ partner })))
    throw new DubApiError({
      code: "forbidden",
      message: "Program network is not available for this partner.",
    });

  const { programSlug } = params;

  const program = await prisma.program.findUniqueOrThrow({
    where: {
      slug: programSlug,
      addedToMarketplaceAt: {
        not: null,
      },
    },
    include: {
      groups: {
        where: {
          slug: DEFAULT_PARTNER_GROUP.slug,
        },
        include: {
          clickReward: true,
          leadReward: true,
          saleReward: true,
          discount: true,
        },
      },
      partners: {
        where: {
          partnerId: partner.id,
        },
      },
      categories: true,
    },
  });

  return NextResponse.json(
    NetworkProgramExtendedSchema.parse({
      ...program,
      rewards:
        program.groups.length > 0
          ? [
              program.groups[0].clickReward,
              program.groups[0].leadReward,
              program.groups[0].saleReward,
            ].filter(Boolean)
          : [],
      discount: program.groups.length > 0 ? program.groups[0].discount : null,
      status: program.partners.length > 0 ? program.partners[0].status : null,
      categories: program.categories.map(({ category }) => category),
      landerData: program.groups?.[0]?.landerData
        ? programLanderSchema.parse(program.groups[0].landerData)
        : null,
    }),
  );
});
