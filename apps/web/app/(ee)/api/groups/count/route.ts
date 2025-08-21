import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { getGroupsCountQuerySchema } from "@/lib/zod/schemas/groups";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/groups/count - get the count of groups for a program
export const GET = withWorkspace(
  async ({ workspace, searchParams }) => {
    const programId = getDefaultProgramIdOrThrow(workspace);
    const { search } = getGroupsCountQuerySchema.parse(searchParams);

    const count = await prisma.partnerGroup.count({
      where: {
        programId,
        ...(search && {
          OR: [
            {
              name: {
                contains: search,
              },
            },
            {
              slug: {
                contains: search,
              },
            },
          ],
        }),
      },
    });

    return NextResponse.json(count);
  },
  {
    requiredPermissions: ["groups.read"],
    requiredPlan: [
      "business",
      "business extra",
      "business max",
      "business plus",
      "advanced",
      "enterprise",
    ],
  },
);
