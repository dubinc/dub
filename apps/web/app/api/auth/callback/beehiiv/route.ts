import { handleProgramOAuthCallback } from "@/lib/better-auth/handle-program-oauth-callback";

// Legacy NextAuth callback URL — keep so Beehiiv's allowlisted redirect URI still works.
export const GET = handleProgramOAuthCallback("beehiiv");
