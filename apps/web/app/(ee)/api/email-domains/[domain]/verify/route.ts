import { getEmailDomainOrThrow } from "@/lib/api/domains/get-email-domain-or-throw";
import { DubApiError } from "@/lib/api/errors";
import { getDefaultProgramIdOrThrow } from "@/lib/api/programs/get-default-program-id-or-throw";
import { assertEnv } from "@/lib/assert-env";
import { withWorkspace } from "@/lib/auth";
import { discoverDomainConnect } from "@/lib/domain-connect/discover";
import type { DomainConnectDiscovery } from "@/lib/domain-connect/types";
import { prisma } from "@/lib/prisma";
import { resend } from "@dub/email/resend";
import { getApexDomain } from "@dub/utils";
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
        code: "internal_server_error",
        message: "Resend domain ID is not found for this domain.",
      });
    }

    const { data: domainData, error: domainError } = await resend.domains.get(
      emailDomain.resendDomainId,
    );

    if (domainError || !domainData) {
      throw new DubApiError({
        code: "internal_server_error",
        message:
          domainError?.message ||
          "Failed to retrieve email domain. Please try again later.",
      });
    }

    // Calling verify temporarily marks the domain as pending, so skip if already verified.
    if (domainData.status !== "verified") {
      const { error: verificationError } = await resend.domains.verify(
        emailDomain.resendDomainId,
      );

      if (verificationError) {
        throw new DubApiError({
          code: "internal_server_error",
          message:
            verificationError.message ||
            "Failed to verify email domain. Please try again later.",
        });
      }
    }

    if (emailDomain.status !== domainData.status) {
      await prisma.emailDomain.update({
        where: {
          id: emailDomain.id,
        },
        data: {
          status: domainData.status,
          lastChecked: new Date(),
        },
      });
    }

    let domainConnect: DomainConnectDiscovery | null = null;
    if (domainData.status !== "verified") {
      assertEnv("DOMAIN_CONNECT_PRIVATE_KEY");
      const apex = getApexDomain(`https://${emailDomain.slug}`);
      domainConnect = await discoverDomainConnect(apex);
    }

    return NextResponse.json({
      ...domainData,
      domainConnect,
    });
  },
  {
    requiredPlan: ["advanced", "enterprise"],
    requiredPermissions: ["domains.read"],
  },
);
