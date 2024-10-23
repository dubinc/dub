import { parse } from "@/lib/middleware/utils";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { prismaEdge } from "@dub/prisma/edge";
import { UserProps } from "../types";

export default async function AdminMiddleware(req: NextRequest) {
  const { path } = parse(req);

  const session = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as {
    id?: string;
    email?: string;
    user?: UserProps;
  };

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const response = await prismaEdge.projectUsers.findUnique({
    where: {
      userId_projectId: {
        userId: session.user.id,
        projectId: DUB_WORKSPACE_ID,
      },
    },
  });

  if (!response) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (path === "/login") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.rewrite(
    new URL(`/admin.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
