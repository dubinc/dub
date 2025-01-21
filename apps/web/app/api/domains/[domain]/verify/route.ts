import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "@/lib/api/domains";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { withWorkspace } from "@/lib/auth";
import { DomainVerificationStatusProps } from "@/lib/types";
import { prisma } from "@dub/prisma";
import { NextResponse } from "next/server";

export const maxDuration = 30;

// GET /api/domains/[domain]/verify - get domain verification status
export const GET = withWorkspace(
  async ({ params, workspace }) => {
    const { slug: domain } = await getDomainOrThrow({
      workspace,
      domain: params.domain,
      dubDomainChecks: true,
    });

    let status: DomainVerificationStatusProps = "Valid Configuration";

    const [domainJson, configJson] = await Promise.all([
      getDomainResponse(domain),
      getConfigResponse(domain),
    ]);

    if (domainJson?.error?.code === "not_found") {
      // domain not found on Vercel project
      status = "Domain Not Found";
      return NextResponse.json({
        status,
        response: { configJson, domainJson },
      });
    } else if (domainJson.error) {
      status = "Unknown Error";
      return NextResponse.json({
        status,
        response: { configJson, domainJson },
      });
    }

    /**
     * Domain has DNS conflicts
     */
    if (configJson?.conflicts.length > 0) {
      status = "Conflicting DNS Records";
      return NextResponse.json({
        status,
        response: { configJson, domainJson },
      });
    }

    /**
     * If domain is not verified, we try to verify now
     */
    if (!domainJson.verified) {
      status = "Pending Verification";
      const verificationJson = await verifyDomain(domain);

      if (verificationJson && verificationJson.verified) {
        /**
         * Domain was just verified
         */
        status = "Valid Configuration";
      }

      return NextResponse.json({
        status,
        response: { configJson, domainJson, verificationJson },
      });
    }

    let prismaResponse: any = null;
    if (!configJson.misconfigured) {
      prismaResponse = await prisma.domain.update({
        where: {
          slug: domain,
        },
        data: {
          verified: true,
          lastChecked: new Date(),
        },
      });
    } else {
      status = "Invalid Configuration";
      prismaResponse = await prisma.domain.update({
        where: {
          slug: domain,
        },
        data: {
          verified: false,
          lastChecked: new Date(),
        },
      });
    }

    return NextResponse.json({
      status,
      response: { configJson, domainJson, prismaResponse },
    });
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
