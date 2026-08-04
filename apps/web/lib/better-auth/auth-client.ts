import {
  emailOTPClient,
  inferAdditionalFields,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import type { auth } from "./auth";

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>(),
    // BA client plugin AuthContext generic variance (same as server emailOTP).
    // @ts-expect-error — do not use `as any` here; that strips plugin inference entirely.
    emailOTPClient(),
  ],
});

type AuthClientError = { message?: string | null } | null;

/**
 * Workaround for Better Auth plugin typing: emailOTPClient() fails
 * BetterAuthClientPlugin assignability (AuthContext generic variance), so
 * authClient.emailOtp / signIn.emailOtp are missing from the inferred client type.
 * Runtime methods exist — these helpers restore typing for call sites.
 */
export const emailOtpClient = {
  sendVerificationOtp: (args: {
    email: string;
    type: "sign-in" | "email-verification" | "forget-password" | "change-email";
  }): Promise<{ data: { success: boolean } | null; error: AuthClientError }> =>
    (authClient as any).emailOtp.sendVerificationOtp(args),

  signIn: (args: {
    email: string;
    otp: string;
  }): Promise<{ data: unknown; error: AuthClientError }> =>
    (authClient as any).signIn.emailOtp(args),
};
