import { withCron } from "@/lib/cron/with-cron";
import { redis } from "@/lib/upstash";
import { logAndRespond } from "../utils";

export const dynamic = "force-dynamic";

// POST /api/cron/disposable-emails
// Sync disposable and Tremendous prohibited email domain blocklists into Redis.
// Runs every Monday at noon UTC (0 12 * * 1)
export const POST = withCron(async () => {
  const [disposableRes, tremendousRes] = await Promise.allSettled([
    fetch(
      "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf",
    ),
    fetch("https://api.tremendous.com/prohibited_email_domains.txt"),
  ]);

  if (disposableRes.status === "rejected") {
    console.warn(
      `Failed to fetch disposable email domains list: ${disposableRes.status} ${disposableRes.reason}`,
    );
  }

  if (tremendousRes.status === "rejected") {
    console.warn(
      `Failed to fetch Tremendous prohibited email domains list: ${tremendousRes.status} ${tremendousRes.reason}`,
    );
  }

  const disposableDomains =
    disposableRes.status === "fulfilled"
      ? (await disposableRes.value.text()).split("\n").filter(Boolean)
      : [];

  const tremendousDomains =
    tremendousRes.status === "fulfilled"
      ? (await tremendousRes.value.text())
          .split("\n")
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean)
      : [];

  if (disposableDomains.length > 0) {
    // Use temporary sets to avoid emptying the old sets
    await redis.del("disposableEmailDomainsTmp");
    await redis.sadd(
      "disposableEmailDomainsTmp",
      ...(disposableDomains as [string]),
    );
    await redis.rename("disposableEmailDomainsTmp", "disposableEmailDomains");
  }

  if (tremendousDomains.length > 0) {
    await redis.del("tremendousProhibitedEmailDomainsTmp");
    await redis.sadd(
      "tremendousProhibitedEmailDomainsTmp",
      ...(tremendousDomains as [string]),
    );
    await redis.rename(
      "tremendousProhibitedEmailDomainsTmp",
      "tremendousProhibitedEmailDomains",
    );
  }

  return logAndRespond(
    `Synced ${disposableDomains.length} disposable and ${tremendousDomains.length} Tremendous prohibited email domains.`,
  );
});
