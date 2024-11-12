import { parse } from "@/lib/middleware/utils";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";
import { prismaEdge } from "../prisma/edge";
import { getUserViaToken } from "./utils/get-user-via-token";

export default async function AdminMiddleware(req: NextRequest) {
  const { path } = parse(req);

  const user = await getUserViaToken(req);

  if (!user && path !== "/login") {
    return NextResponse.redirect(new URL("/login", req.url));
  } else if (user) {
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
    } else if (path === "/login") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.rewrite(
    new URL(`/admin.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
