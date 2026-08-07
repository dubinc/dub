import { handleProgramOAuthCallback } from "@/lib/better-auth/handle-program-oauth-callback";

// Legacy NextAuth callback URL — keep so Framer's allowlisted redirect URI still works.
export const GET = handleProgramOAuthCallback("framer");
