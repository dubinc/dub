import type { z } from "zod/v4";
import {
  getVerificationTokenConfig,
  VERIFICATION_TOKEN_CONFIG,
  type VerificationTokenKind,
} from "./constants";

export function buildMagicLinkUrl({
  origin,
  callbackURL,
  token,
}: {
  origin: string;
  callbackURL: string;
  token: string;
}) {
  const url = new URL("/api/auth/magic-link/verify", origin);
  url.searchParams.set("token", token);
  url.searchParams.set("callbackURL", callbackURL);
  return url.toString();
}

export function parseVerificationTokenValue<T extends VerificationTokenKind>({
  kind,
  value,
}: {
  kind: T;
  value: string;
}): z.infer<(typeof VERIFICATION_TOKEN_CONFIG)[T]["valueSchema"]> | null {
  try {
    const { valueSchema } = getVerificationTokenConfig(kind);
    return valueSchema.parse(JSON.parse(value)) as z.infer<
      (typeof VERIFICATION_TOKEN_CONFIG)[T]["valueSchema"]
    >;
  } catch {
    return null;
  }
}
