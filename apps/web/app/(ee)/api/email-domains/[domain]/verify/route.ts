import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { withWorkspace } from "@/lib/auth";
import { resend } from "@dub/email/resend";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

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

    if (emailDomain.status !== domainResponse.data.status) {
      await prisma.emailDomain.update({
        where: {
          id: emailDomain.id,
        },
        data: {
          status: domainResponse.data.status,
          lastChecked: new Date(),
        },
      });
    }

    return NextResponse.json(domainResponse.data);
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["domains.read"],
  },
);
