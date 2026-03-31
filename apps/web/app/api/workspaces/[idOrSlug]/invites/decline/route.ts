import { DubApiError } from "@/lib/api/errors";
import { withSession } from "@/lib/auth";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

// POST /api/workspaces/[idOrSlug]/invites/decline – decline a workspace invite
export const POST = withSession(async ({ session, params }) => {
  const { idOrSlug: slug } = params;

  const invite = await prisma.projectInvite.findFirst({
    where: {
      email: session.user.email,
      project: {
        slug,
      },
    },
  });

  if (!invite) {
    throw new DubApiError({
      code: "not_found",
      message: "This invite is not found.",
    });
  }

  await prisma.projectInvite.delete({
    where: {
      email_projectId: {
        email: session.user.email,
        projectId: invite.projectId,
      },
    },
  });

  return NextResponse.json({ message: "Invite declined." });
});
