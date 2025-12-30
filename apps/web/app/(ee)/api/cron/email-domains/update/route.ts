import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyQstashSignature } from "@/lib/cron/verify-qstash";
import { resend } from "@dub/email/resend/client";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { z } from "zod";
import { logAndRespond } from "../../utils";

const schema = z.object({
  domainId: z.string(),
});

export const dynamic = "force-dynamic";

// POST /api/cron/email-domains/update
// Update the Resend domain to enable click tracking
export async function POST(req: Request) {
  try {
    const rawBody = await req.text();

    await verifyQstashSignature({ req, rawBody });

    const { domainId } = schema.parse(JSON.parse(rawBody));

    if (!resend) {
      return logAndRespond("Resend is not configured. Skipping update...");
    }

    const domainRecord = await prisma.emailDomain.findUnique({
      where: {
        id: domainId,
      },
      select: {
        slug: true,
        resendDomainId: true,
      },
    });

    if (!domainRecord) {
      return logAndRespond(`Domain ${domainId} not found. Skipping update...`);
    }

    if (!domainRecord.resendDomainId) {
      return logAndRespond(
        `Resend domain ID is not found for domain ${domainRecord.slug}. Skipping update...`,
      );
    }

    const { error } = await resend.domains.update({
      id: domainRecord.resendDomainId,
      openTracking: true,
      clickTracking: false,
      tls: "enforced",
    });

    // This will be retried by QStash if it fails.
    if (error) {
      throw new DubApiError({
        code: "bad_request",
        message: error.message,
      });
    }

    return logAndRespond(`Domain ${domainRecord.slug} updated successfully.`);
  } catch (error) {
    await log({
      message: `Resend email domain update failed with error ${JSON.stringify(error)}`,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}
