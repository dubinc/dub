import { parse } from "@/lib/middleware/utils";
import { DUB_WORKSPACE_ID } from "@dub/utils";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { UserProps } from "../types";
import { getEdgeClient } from "../db";

export default async function AdminMiddleware(req: NextRequest) {
  const { path } = parse(req);
  let isAdmin = false;

  const session = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as {
    id?: string;
    email?: string;
    user?: UserProps;
  };

  const client = getEdgeClient();

  const response = await client.projectUsers.findFirst({
    where: {
      userId: session?.user?.id,
    },
    select: {
      projectId: true,
    },
  });

  if (response?.projectId === DUB_WORKSPACE_ID) {
    isAdmin = true;
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
