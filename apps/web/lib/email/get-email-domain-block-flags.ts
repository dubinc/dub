import { redis } from "@/lib/upstash";
import { get } from "@vercel/edge-config";
import { extractEmailDomain } from "./extract-email-domain";

type EmailDomainBlockFlags = {
  isDisposable: boolean;
  matchesBlockedTerms: boolean;
};

/**
 * Returns whether the email's domain is in Redis disposableEmailDomains
 * and/or matches Edge Config emailDomainTerms (substring regex).
 */
export async function getEmailDomainBlockFlags(
  email: string,
): Promise<EmailDomainBlockFlags> {
  const emailDomain = extractEmailDomain(email);
  if (!emailDomain) {
    return {
      isDisposable: false,
      matchesBlockedTerms: false,
    };
  }

  const [isDisposable, emailDomainTerms] = await Promise.all([
    redis.sismember("disposableEmailDomains", emailDomain),
    process.env.EDGE_CONFIG ? get("emailDomainTerms") : [],
  ]);

  const blockedTerms = Array.isArray(emailDomainTerms)
    ? (emailDomainTerms as unknown[])
        .map((term) =>
          String(term)
            .trim()
            .toLowerCase()
            .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        )
        .filter((term) => term.length > 0)
    : [];

  const matchesBlockedTerms =
    blockedTerms.length > 0
      ? new RegExp(blockedTerms.join("|")).test(emailDomain)
      : false;

  return {
    isDisposable: Boolean(isDisposable),
    matchesBlockedTerms,
  };
}
