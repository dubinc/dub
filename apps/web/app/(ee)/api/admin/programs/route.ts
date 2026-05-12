import { withAdmin } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const reorderProgramsSchema = z.object({
  updates: z
    .array(
      z.object({
        programId: z.string().trim().min(1),
        marketplaceRanking: z.number().int().positive(),
      }),
    )
    .min(1),
});

// GET /api/admin/programs
export const GET = withAdmin(async () => {
  const programs = await prisma.program.findMany({
    where: {
      addedToMarketplaceAt: {
        not: null,
      },
    },
    orderBy: [{ marketplaceRanking: "asc" }, { addedToMarketplaceAt: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      url: true,
      description: true,
      addedToMarketplaceAt: true,
      marketplaceRanking: true,
      categories: {
        select: {
          category: true,
        },
      },
    },
  });

  return NextResponse.json({
    programs: programs.map(({ categories, ...program }) => ({
      ...program,
      categories: categories.map(({ category }) => category),
    })),
  });
});

// PATCH /api/admin/programs
export const PATCH = withAdmin(
  async ({ req }) => {
    const { updates } = reorderProgramsSchema.parse(await req.json());

    const MAX_MARKETPLACE_RANKING = 2147483647;
    const uniqueUpdates = [
      ...new Map(updates.map((update) => [update.programId, update])).values(),
    ];

    const programs = await prisma.program.findMany({
      where: {
        id: {
          in: uniqueUpdates.map(({ programId }) => programId),
        },
        addedToMarketplaceAt: {
          not: null,
        },
      },
      select: {
        id: true,
        marketplaceRanking: true,
      },
    });

    const programById = new Map(programs.map((program) => [program.id, program]));
    const updatesToApply = uniqueUpdates.filter(({ programId }) => {
      const program = programById.get(programId);
      return (
        !!program && program.marketplaceRanking !== MAX_MARKETPLACE_RANKING
      );
    });

    await prisma.$transaction(
      updatesToApply.map(({ programId, marketplaceRanking }) =>
        prisma.program.update({
          where: {
            id: programId,
          },
          data: {
            marketplaceRanking,
          },
        }),
      ),
    );

    return NextResponse.json({
      ok: true,
      updated: updatesToApply.length,
    });
  },
  {
    requiredRoles: ["owner"],
  },
);
