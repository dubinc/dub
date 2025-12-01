import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { redis } from "@/lib/upstash";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Cron to update the disposable email domains list in Redis
// Runs every Monday at noon UTC (0 12 * * 1)
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({
      req,
      rawBody,
    });

    const disposableEmails = await fetch(
      "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf",
    );

    const domains = (await disposableEmails.text()).split("\n").filter(Boolean);

    if (domains.length < 100) {
      throw new Error("Disposable email domains list is too short");
    }

    // Use a temporary set to avoid emptying the old set
    await redis.del("disposableEmailDomainsTmp");
    await redis.sadd("disposableEmailDomainsTmp", ...(domains as [string]));
    await redis.rename("disposableEmailDomainsTmp", "disposableEmailDomains");

    return NextResponse.json({ status: "OK" });
  } catch (error) {
    await log({
      message: `Error updating disposable email domains list: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}
