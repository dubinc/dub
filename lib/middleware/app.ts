import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { parse } from "#/lib/middleware/utils";
import { UserProps } from "../types";
import { conn } from "../planetscale";

export default async function AppMiddleware(req: NextRequest) {
  const { path } = parse(req);
  const session = (await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })) as {
    email?: string;
    user?: UserProps;
  };
  // if there's no session and the path isn't /login or /register, redirect to /login
  if (
    !session?.email &&
    path !== "/login" &&
    path !== "/register" &&
    path !== "/auth/saml"
  ) {
    return NextResponse.redirect(
      new URL(
        `/login${path !== "/" ? `?next=${encodeURIComponent(path)}` : ""}`,
        req.url,
      ),
    );

    // if there's a session
  } else if (session?.email) {
    // if the user was created in the last 10s
    // (this is a workaround because the `isNewUser` flag is triggered when a user does `dangerousEmailAccountLinking`)
    if (
      session?.user?.createdAt &&
      new Date(session?.user?.createdAt).getTime() > Date.now() - 10000 &&
      path === "/"
    ) {
      // check if the user has an existing project invite, if yes, we skip the onboarding flow
      const [existingInvite, existingProject] = [
        await conn
          ?.execute("SELECT projectId FROM ProjectInvite WHERE email = ?", [
            session.email,
          ])
          .then((res) => res.rows[0] as { projectId: string } | undefined),
        await conn
          ?.execute("SELECT projectId FROM ProjectUsers WHERE userId = ?", [
            session.user.id,
          ])
          .then((res) => res.rows[0] as { projectId: string } | undefined),
      ];

      // if there's an existing invite or there's an existing project
      if (existingInvite || existingProject) {
        // get the project slug
        const project = await conn
          ?.execute("SELECT slug from Project WHERE id = ?", [
            existingInvite
              ? existingInvite.projectId
              : existingProject?.projectId,
          ])
          .then((res) => res.rows[0] as { slug: string } | undefined);

        // redirect them to the project slug
        if (project?.slug) {
          return NextResponse.redirect(new URL(project.slug, req.url));
        } else {
          return NextResponse.redirect(new URL("/", req.url));
        }
      } else {
        // if there's no existing invite, redirect to /welcome flow
        return NextResponse.redirect(new URL("/welcome", req.url));
      }

      // if the path is /login or /register, redirect to "/"
    } else if (path === "/login" || path === "/register") {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  // otherwise, rewrite the path to /app
  return NextResponse.rewrite(new URL(`/app${path}`, req.url));
}
