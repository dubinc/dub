import { UserProps } from "@/lib/types";
import { prismaEdge } from "@dub/prisma/edge";
import { NextRequest } from "next/server";

export async function hasPendingInvites({
  req,
  user,
}: {
  req: NextRequest;
  user: UserProps;
}) {
  if (
    req.nextUrl.searchParams.get("invite") ||
    req.nextUrl.pathname.startsWith("/invites/")
  ) {
    return true;
  }

  const pendingInvites = await prismaEdge.projectInvite.count({
    where: {
      email: user.email,
      expires: {
        gte: new Date(),
      },
    },
  });

  return pendingInvites > 0;
}
