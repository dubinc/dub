import { domainExists, isValidDomain } from "@/lib/api/domains";
import { withSession } from "@/lib/auth";
import dns from "dns/promises";
import { NextResponse } from "next/server";

// GET /api/domains/[domain]/valdiate – check if a domain is valid
export const GET = withSession(async ({ params }) => {
  const { domain } = params;
  const validDomain = isValidDomain(domain);
  if (!validDomain) {
    return NextResponse.json({
      status: "invalid",
    });
  }
  const exists = await domainExists(domain);
  if (exists) {
    return NextResponse.json({
      status: "conflict",
    });
  }
  const hasSite = await hasSiteConfigured(domain);
  if (hasSite) {
    return NextResponse.json({
      status: "has site",
    });
  }
  return NextResponse.json({
    status: "available",
  });
});

// Helper function to check if a site is active on the domain
async function hasSiteConfigured(domain: string): Promise<boolean> {
  try {
    // Try HTTP HEAD request first (both HTTP and HTTPS)
    const urls = [`https://${domain}`, `http://${domain}`];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        const response = await fetch(url, {
          method: "HEAD",
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) return true;
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // If request was aborted due to timeout, continue to next check
          continue;
        }
        // Continue to next URL if this one fails
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
