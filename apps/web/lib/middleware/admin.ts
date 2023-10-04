import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { parse } from "#/lib/middleware/utils";
import { UserProps } from "../types";
import { conn } from "../planetscale";
import { DUB_PROJECT_ID } from "../constants";

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

  const response = await conn
    ?.execute("SELECT projectId FROM ProjectUsers WHERE userId = ?", [
      session?.user?.id,
    ])
    .then((res) => res.rows[0] as { projectId: string } | undefined);

  if (response?.projectId === DUB_PROJECT_ID) {
    isAdmin = true;
  }

  if (path === "/login" && isAdmin) {
    return NextResponse.redirect(new URL("/", req.url));
  } else if (path !== "/login" && !isAdmin) {
    return NextResponse.redirect(new URL(`/login`, req.url));
  }

  return NextResponse.rewrite(
    new URL(`/admin${path === "/" ? "" : path}`, req.url),
  );
}
