import { redis } from "@/lib/upstash";
import { get } from "@vercel/edge-config";
import { extractEmailDomain } from "./extract-email-domain";

/**
 * True when the email's domain is in Redis disposableEmailDomains
 * or matches Edge Config emailDomainTerms (substring regex).
 */
export async function isEmailDomainBlocked(email: string): Promise<boolean> {
  const emailDomain = extractEmailDomain(email);
  if (!emailDomain) {
    return false;
  }

  const [isDisposable, emailDomainTerms] = await Promise.all([
    redis.sismember("disposableEmailDomains", emailDomain),
    process.env.EDGE_CONFIG ? get("emailDomainTerms") : [],
  ]);

  const escapedDomainTerms =
    emailDomainTerms && Array.isArray(emailDomainTerms)
      ? emailDomainTerms
          .map((term: string) =>
            String(term)
              .trim()
              .toLowerCase()
              .replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
          )
          .filter((term) => term.length > 0)
      : [];

  const blacklistedEmailDomainTermsRegex =
    escapedDomainTerms.length > 0
      ? new RegExp(escapedDomainTerms.join("|"))
      : null;

  return Boolean(
    isDisposable ||
      (blacklistedEmailDomainTermsRegex &&
        blacklistedEmailDomainTermsRegex.test(emailDomain)),
  );
}
