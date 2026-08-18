"use client";

import { authClient } from "@/lib/better-auth/auth-client";

export type Session = NonNullable<
  ReturnType<typeof authClient.useSession>["data"]
>;

export type SessionStatus = "loading" | "authenticated" | "unauthenticated";

export function useSession() {
  const { data, isPending, error, refetch, isRefetching } =
    authClient.useSession();

  const status: SessionStatus = isPending
    ? "loading"
    : data
      ? "authenticated"
      : "unauthenticated";

  // Bypass cookieCache so post-mutation refreshes see updated identity fields
  const update: typeof refetch = (queryParams) =>
    refetch({
      ...queryParams,
      query: {
        ...queryParams?.query,
        disableCookieCache: true,
      },
    });

  return {
    data,
    status,
    error,
    isPending,
    isRefetching,
    refetch,
    update,
  };
}

export async function signOut(options?: { callbackUrl?: string }) {
  await authClient.signOut({
    fetchOptions: {
      onSuccess: () => {
        window.location.href = options?.callbackUrl ?? "/login";
      },
    },
  });
}
