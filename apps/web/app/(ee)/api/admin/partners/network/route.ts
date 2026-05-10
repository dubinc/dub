import { withAdmin } from "@/lib/auth";
import { adminNetworkPartnerSchema } from "@/lib/zod/schemas/admin";
import { getPaginationQuerySchema } from "@/lib/zod/schemas/misc";
import { prisma } from "@dub/prisma";
import { PartnerNetworkStatus } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const querySchema = z
  .object({
    networkStatus: z.enum(PartnerNetworkStatus).optional(),
    country: z.string().optional(),
    search: z.string().trim().min(1).optional(),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  })
  .extend(getPaginationQuerySchema({ pageSize: 100 }));

// GET /api/admin/partners/network
export const GET = withAdmin(async ({ searchParams }) => {
  const { networkStatus, country, search, sortOrder, page, pageSize } =
    querySchema.parse(searchParams);
  const effectiveNetworkStatus = search
    ? undefined
    : networkStatus ?? "submitted";

  const partners = await prisma.partner.findMany({
    where: {
      ...(effectiveNetworkStatus && { networkStatus: effectiveNetworkStatus }),
      ...(country && { country }),
      ...(search && {
        email: {
          contains: search,
        },
      }),
    },
    orderBy: {
      [networkStatus === "submitted"
        ? "submittedAt"
        : networkStatus === "draft"
          ? "updatedAt"
          : "reviewedAt"]: sortOrder,
    },
    include: {
      platforms: true,
      industryInterests: true,
      preferredEarningStructures: true,
      salesChannels: true,
      programs: {
        orderBy: {
          totalCommissions: "desc",
        },
        include: {
          program: true,
        },
      },
    },
    take: pageSize,
    skip: ((page ?? 1) - 1) * pageSize,
  });

  return NextResponse.json({
    partners: adminNetworkPartnerSchema.array().parse(
      partners.map((partner) => ({
        ...partner,
        industryInterests: partner.industryInterests.map(
          (interest) => interest.industryInterest,
        ),
        preferredEarningStructures: partner.preferredEarningStructures.map(
          (structure) => structure.preferredEarningStructure,
        ),
        salesChannels: partner.salesChannels.map(
          (channel) => channel.salesChannel,
        ),
        programs: partner.programs.map((program) => ({
          ...program,
          ...program.program,
        })),
      })),
    ),
  });
});
