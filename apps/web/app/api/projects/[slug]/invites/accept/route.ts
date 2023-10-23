import { withSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/projects/[slug]/invites/accept – accept a project invite
export const POST = withSession(async ({ session, params }) => {
  const invite = await prisma.projectInvite.findFirst({
    where: {
      email: session.user.email,
      project: {
        slug: params.slug,
      },
    },
    select: {
      expires: true,
      projectId: true,
    },
  });
  if (!invite) {
    return new Response("Invalid invite", { status: 404 });
  } else if (invite.expires < new Date()) {
    return new Response("Invite expired", { status: 410 });
  } else {
    const response = await Promise.all([
      prisma.projectUsers.create({
        data: {
          userId: session.user.id,
          role: "member",
          projectId: invite.projectId,
        },
      }),
      prisma.projectInvite.delete({
        where: {
          email_projectId: {
            email: session.user.email,
            projectId: invite.projectId,
          },
        },
      }),
    ]);
    return NextResponse.json(response);
  }
});
