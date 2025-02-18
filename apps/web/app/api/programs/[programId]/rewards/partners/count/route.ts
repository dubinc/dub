import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { rewardPartnersQuerySchema } from "@/lib/zod/schemas/rewards";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// GET /api/programs/[programId]/rewards/partners/count
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const { rewardId, event, search } =
      rewardPartnersQuerySchema.parse(searchParams);

    const count = await prisma.programEnrollment.count({
      where: {
        programId,
        ...(!rewardId
          ? {
              NOT: {
                rewards: {
                  some: {
                    reward: {
                      event,
                    },
                  },
                },
              },
            }
          : {
              rewards: {
                some: {
                  rewardId,
                },
              },
            }),
        ...(search && {
          partner: {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          },
        }),
      },
    });

    return NextResponse.json(count);
  },
);
