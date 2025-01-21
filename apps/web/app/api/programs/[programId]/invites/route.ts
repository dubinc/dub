import { getProgramOrThrow } from "@/lib/api/programs/get-program-or-throw";
import { withWorkspace } from "@/lib/auth";
import { partnerInvitesQuerySchema } from "@/lib/zod/schemas/partners";
import { ProgramInviteSchema } from "@/lib/zod/schemas/programs";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/invites - get all the invites for a program
export const GET = withWorkspace(
  async ({ workspace, params, searchParams }) => {
    const { programId } = params;
    const { page, pageSize } = partnerInvitesQuerySchema.parse(searchParams);

    await getProgramOrThrow({
      workspaceId: workspace.id,
      programId,
    });

    const invites = await prisma.programInvite.findMany({
      where: {
        programId,
      },
      include: {
        link: {
          select: {
            shortLink: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return NextResponse.json(
      z.array(ProgramInviteSchema).parse(
        invites.map((invite) => ({
          ...invite,
          shortLink: invite.link?.shortLink,
        })),
      ),
    );
  },
);
