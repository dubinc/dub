import { isValidDomain } from "@/lib/api/domains/is-valid-domain";
import { domainExists } from "@/lib/api/domains/utils";
import { validateDubLinkSubdomain } from "@/lib/api/domains/validate-dub-link-subdomain";
import { safeFetch } from "@/lib/api/safe-fetch";
import { withSession } from "@/lib/auth";
import dns from "dns/promises";
import { NextResponse } from "next/server";

// GET /api/domains/[domain]/validate – check if a domain is valid
export const GET = withSession(async ({ params }) => {
  const { domain } = params;
  const validDomain = isValidDomain(domain);
  if (!validDomain) {
    return NextResponse.json({
      status: "invalid",
    });
  }
  if (domain.startsWith("www.")) {
    return NextResponse.json({
      status: "invalid",
      message: "Custom domain cannot start with www.",
    });
  }
  const dubLinkError = validateDubLinkSubdomain(domain);
  if (dubLinkError) {
    return NextResponse.json({
      status: "invalid",
      message: dubLinkError.error,
    });
  }
  const exists = await domainExists(domain);
  if (exists) {
    return NextResponse.json({
      status: "conflict",
    });
  }
  // skip site check for .dub.link subdomains
  if (!domain.endsWith(".dub.link")) {
    const hasSite = await hasSiteConfigured(domain);
    if (hasSite) {
      return NextResponse.json({
        status: "has site",
      });
    }
  }
  return NextResponse.json({
    status: "available",
  });
});

// Helper function to check if a site is active on the domain
async function hasSiteConfigured(domain: string): Promise<boolean> {
  try {
    // Try HTTP HEAD request first (both HTTP and HTTPS).
    // safeFetch enforces SSRF guards on the user-supplied domain (the path
    // param flows in here) so this can't be used to probe internal hosts.
    const urls = [`https://${domain}`, `http://${domain}`];

    for (const url of urls) {
      try {
        const response = await safeFetch(
          url,
          { method: "HEAD" },
          { timeoutMs: 3000 },
        );
        if (response.ok) return true;
      } catch {
        // Continue to next URL if this one fails (timeout, SSRF guard, etc.)
        continue;
      }
    }

    // If HTTP checks fail, fallback to DNS lookup with timeout
    const dnsPromise = dns.resolve(domain);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("DNS Timeout")), 3000),
    );
    try {
      const records = (await Promise.race([
        dnsPromise,
        timeoutPromise,
      ])) as string[];
      return records.length > 0;
    } catch (e) {
      // If DNS times out or fails, treat as available
      return false;
    }
  } catch (error) {
    // If all checks fail, assume no site is configured
    return false;
  }
}
