import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { DubApiError } from "../api/errors";
import { auth } from "./auth";

export async function getServerSession(requestHeaders?: Headers) {
  const result = await auth.api.getSession({
    headers: requestHeaders ?? (await headers()),
  });

  console.debug("[getServerSession]", result);

  return {
    session: result?.session ?? null,
    user: result?.user ?? null,
  };
}

export type SessionUser = NonNullable<
  Awaited<ReturnType<typeof getServerSession>>["user"]
>;

export type ServerSession = {
  session: NonNullable<Awaited<ReturnType<typeof getServerSession>>["session"]>;
  user: SessionUser;
};

export async function requireServerSession(): Promise<ServerSession> {
  const result = await getServerSession();

  if (!result.session || !result.user) {
    throw new DubApiError({
      code: "unauthorized",
      message: "Unauthorized. Please login to continue.",
    });
  }

  return {
    session: result.session,
    user: result.user,
  };
}

export async function requireServerSessionRedirect(
  redirectTo = "/login",
): Promise<ServerSession> {
  const result = await getServerSession();

  if (!result.session || !result.user) {
    redirect(redirectTo);
  }

  return {
    session: result.session,
    user: result.user,
  };
}
