import { headers } from "next/headers";
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

export type ServerSession = NonNullable<
  Awaited<ReturnType<typeof getServerSession>>
>;
