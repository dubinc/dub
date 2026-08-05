import { auth } from "@/lib/better-auth/auth";
import { programOAuthProviderIds } from "@/lib/better-auth/program-oauth";
import { NextRequest } from "next/server";

/**
 * NextAuth used /api/auth/callback/:provider for program OAuth.
 * Better Auth generic OAuth expects /api/auth/oauth2/callback/:provider.
 */
export function handleProgramOAuthCallback(provider: string) {
  if (!programOAuthProviderIds.includes(provider)) {
    throw new Error(`Unknown program OAuth provider: ${provider}`);
  }

  return async (request: NextRequest) => {
    const url = new URL(request.url);
    url.pathname = `/api/auth/oauth2/callback/${provider}`;

    return auth.handler(new Request(url, request));
  };
}
