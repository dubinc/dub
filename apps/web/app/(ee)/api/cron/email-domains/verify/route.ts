import { DubApiError, handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { resend } from "@dub/email/resend/client";
import { prisma } from "@dub/prisma";
import { log } from "@dub/utils";
import { EmailDomain } from "@prisma/client";
import { NextResponse } from "next/server";
import { logAndRespond } from "../../utils";

export const dynamic = "force-dynamic";

// GET /api/cron/email-domains/verify
// Runs every hour (0 * * * *)
export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    if (!resend) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Resend is not configured.",
      });
    }

    const domains = await prisma.emailDomain.findMany({
      where: {
        resendDomainId: {
          not: null,
        },
      },
      orderBy: {
        lastChecked: "asc",
      },
      take: 10,
    });

    if (domains.length === 0) {
      return logAndRespond(
        "No email domains to check the verification status.",
      );
    }

    const results = await Promise.allSettled(
      domains.map((domain) => verifyEmailDomain(domain)),
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error(error);

    await log({
      message:
        "Email domains verification cron failed. Error: " + error.message,
      type: "errors",
    });

    return handleAndReturnErrorResponse(error);
  }
}

async function verifyEmailDomain(domain: EmailDomain) {
  if (!domain.resendDomainId) {
    return null;
  }

  const { data: resendDomain, error } = await resend!.domains.get(
    domain.resendDomainId,
  );

  if (error) {
    return null;
  }

  await prisma.emailDomain.update({
    where: {
      id: domain.id,
    },
    data: {
      status: resendDomain.status,
      lastChecked: new Date(),
    },
  });

  const statusChanged = resendDomain.status !== domain.status;

  if (statusChanged) {
    await log({
      message: `Email domain *${domain.slug}* status changed to *${resendDomain.status}*`,
      type: "cron",
    });
  }

  // TODO:
  // Send email notification

  return {
    domain,
  };
}
