import { getProgramOrThrow } from "@/lib/api/programs/get-program";
import { withWorkspace } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProgramInviteSchema } from "@/lib/zod/schemas/programs";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/programs/[programId]/invites - get all the invites for a program
export const GET = withWorkspace(async ({ workspace, params }) => {
  const { programId } = params;

  await getProgramOrThrow({
    workspaceId: workspace.id,
    programId,
  });

  const invites = await prisma.programInvite.findMany({
    where: {
      programId,
    },
    include: {
      link: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(
    z.array(ProgramInviteSchema).parse(
      invites.map((invite) => ({
        ...invite,
        shortLink: invite.link?.shortLink,
      })),
    ),
  );
});
