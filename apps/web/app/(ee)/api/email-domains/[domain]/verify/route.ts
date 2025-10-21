import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { ResendDomainRecordSchema } from "@/lib/zod/schemas/email-domains";
import { resend } from "@dub/email/resend";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

// GET /api/email-domains/[domain]/verify - verify an email domain
export const GET = withWorkspace(
  async ({ workspace, params }) => {
    const { domain } = params;
    const programId = getDefaultProgramIdOrThrow(workspace);

    const emailDomain = await getEmailDomainOrThrow({
      programId,
      domain,
    });

    if (!resend) {
      throw new DubApiError({
        code: "internal_server_error",
        message: "Resend is not configured.",
      });
    }

    if (!emailDomain.resendDomainId) {
      throw new DubApiError({
        code: "not_found",
        message: "Resend domain ID is not found for this domain.",
      });
    }

    if (emailDomain.verified) {
      return NextResponse.json({});
    }

    const [verificationResponse, domainResponse] = await Promise.all([
      resend.domains.verify(emailDomain.resendDomainId),
      resend.domains.get(emailDomain.resendDomainId),
    ]);

    if (verificationResponse.error || domainResponse.error) {
      throw new DubApiError({
        code: "internal_server_error",
        message:
          verificationResponse.error?.message ||
          domainResponse.error?.message ||
          "Failed to verify email domain. Please try again later.",
      });
    }

    await prisma.emailDomain.update({
      where: {
        id: emailDomain.id,
      },
      data: {
        verified: domainResponse.data.status === "verified" ? true : false,
        lastChecked: new Date(),
      },
    });

    return NextResponse.json(
      z.array(ResendDomainRecordSchema).parse(domainResponse.data.records),
    );
  },
  {
    requiredPlan: ["advanced", "enterprise"],
  },
);
