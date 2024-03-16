import { auth } from "@/lib/auth";
import { parse } from "@/lib/middleware/utils";
import prisma from "@/lib/prisma";
import { DUB_PROJECT_ID } from "@dub/utils";
import { NextRequest, NextResponse } from "next/server";

export default async function AdminMiddleware(req: NextRequest) {
  const { path } = parse(req);
  let isAdmin = false;

  const session = await auth();

  if (session?.user?.id) {
    const response = await prisma.projectUsers.findUnique({
      where: {
        userId_projectId: {
          userId: session.user.id,
          projectId: DUB_PROJECT_ID,
        },
      },
    });

    if (response?.projectId === DUB_PROJECT_ID) {
      isAdmin = true;
    }
  }

  if (path === "/login" && isAdmin) {
    return NextResponse.redirect(new URL("/", req.url));
  } else if (path !== "/login" && !isAdmin) {
    return NextResponse.redirect(new URL(`/login`, req.url));
  }

  return NextResponse.rewrite(
    new URL(`/admin.dub.co${path === "/" ? "" : path}`, req.url),
  );
}
