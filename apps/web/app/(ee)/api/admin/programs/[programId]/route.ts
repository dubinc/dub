import { withAdmin } from "@/lib/auth";
import { MAX_PROGRAM_CATEGORIES } from "@/lib/constants/program";
import { prisma } from "@dub/prisma";
import { Category } from "@dub/prisma/client";
import { NextResponse } from "next/server";
import * as z from "zod/v4";

const updateProgramSchema = z
  .object({
    description: z.string().trim().max(4000).nullable().optional(),
    categories: z.array(z.enum(Category)).max(MAX_PROGRAM_CATEGORIES).optional(),
  })
  .refine(
    (data) => data.description !== undefined || data.categories !== undefined,
    {
      message: "No program fields provided for update.",
    },
  );

// PATCH /api/admin/programs/[programId]
export const PATCH = withAdmin(
  async ({ params, req }) => {
    const { programId } = params;
    const parsed = updateProgramSchema.parse(await req.json());

    const program = await prisma.program.findUnique({
      where: {
        id: programId,
      },
      select: {
        id: true,
        addedToMarketplaceAt: true,
      },
    });

    if (!program || !program.addedToMarketplaceAt) {
      return new Response("Program not found in marketplace.", { status: 404 });
    }

    const updateData: {
      description?: string | null;
      categories?: {
        deleteMany: { programId: string };
        createMany: {
          data: { category: Category }[];
          skipDuplicates: true;
        };
      };
    } = {};

    if (parsed.description !== undefined) {
      updateData.description = parsed.description?.length
        ? parsed.description
        : null;
    }

    if (parsed.categories !== undefined) {
      const uniqueCategories = [...new Set(parsed.categories)];
      updateData.categories = {
        deleteMany: {
          programId,
        },
        createMany: {
          data: uniqueCategories.map((category) => ({ category })),
          skipDuplicates: true,
        },
      };
    }

    const updatedProgram = await prisma.program.update({
      where: {
        id: programId,
      },
      data: updateData,
      select: {
        id: true,
        description: true,
        categories: {
          select: {
            category: true,
          },
        },
      },
    });

    return NextResponse.json({
      ...updatedProgram,
      categories: updatedProgram.categories.map(({ category }) => category),
    });
  },
  {
    requiredRoles: ["owner"],
  },
);
