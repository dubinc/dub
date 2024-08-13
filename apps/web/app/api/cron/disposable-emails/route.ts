import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { redis } from "@/lib/upstash";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";

// Cron to update the disposable email domains list in Redis
// Runs every Monday at noon UTC (0 12 * * 1)

export const dynamic = "force-dynamic";

async function handler(req: Request) {
  try {
    if (req.method === "GET") await verifyVercelSignature(req);
    else if (req.method === "POST") await verifyQstashSignature(req);

    const disposableEmails = await fetch(
      "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf",
    );

    const domains = (await disposableEmails.text()).split("\n").filter(Boolean);
    if (domains.length < 100) {
      // There should definitely be at least 100 domains - something is wrong
      throw new Error("Disposable email domains list is too short");
    }

    // Use a temporary set to avoid emptying the old set
    await redis.del("disposableEmailDomainsTmp");
    await redis.sadd("disposableEmailDomainsTmp", ...domains);
    await redis.rename("disposableEmailDomainsTmp", "disposableEmailDomains");

    return NextResponse.json({
      response: "success",
    });
  } catch (error) {
    await log({
      message: `Error updating disposable email domains list: ${error.message}`,
      type: "cron",
    });

    return handleAndReturnErrorResponse(error);
  }
}

export { handler as GET, handler as POST };
