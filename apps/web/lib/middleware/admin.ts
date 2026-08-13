import { prismaEdge } from "@/lib/prisma/edge";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { getMiddlewareSession } from "../better-auth/get-middleware-session";
import { parse } from "./utils/parse";

export async function AdminMiddleware(req: NextRequest) {
  const { path } = parse(req);

  const { user } = await getMiddlewareSession(req);

  if (!user && path !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (user) {
    const isAdminUser = await prismaEdge.projectUsers.findUnique({
      where: {
        userId_projectId: {
          userId: user.id,
          projectId: DUB_WORKSPACE_ID,
        },
      },
    });

    if (!isAdminUser) {
      return NextResponse.next(); // throw 404 page
    }

    if (path === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.rewrite(
    new URL(`/admin.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
