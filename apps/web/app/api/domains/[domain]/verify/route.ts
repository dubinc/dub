import { getConfigResponse } from "@/lib/api/domains/get-config-response";
import { getDomainOrThrow } from "@/lib/api/domains/get-domain-or-throw";
import { getDomainResponse } from "@/lib/api/domains/get-domain-response";
import { verifyDomainWithRetry } from "@/lib/api/domains/verify-domain";
import { withWorkspace } from "@/lib/auth";
import { discoverDomainConnectIfEligible } from "@/lib/domain-connect/discover";
import type { DomainConnectDiscovery } from "@/lib/domain-connect/types";
import { prisma } from "@/lib/prisma";
import { DomainVerificationStatusProps } from "@/lib/types";
import { getApexDomain } from "@dub/utils";
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
    const apex = getApexDomain(`https://${domain}`);

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
        domainConnect: null,
      });
    } else if (domainJson.error) {
      status = "Unknown Error";
      return NextResponse.json({
        status,
        response: { configJson, domainJson },
        domainConnect: null,
      });
    }

    /**
     * Domain has DNS conflicts
     */
    if (configJson?.conflicts && configJson.conflicts.length > 0) {
      status = "Conflicting DNS Records";
      return NextResponse.json({
        status,
        response: { configJson, domainJson },
        domainConnect: null,
      });
    }

    /**
     * If domain is not verified, we try to verify now
     */
    if (!domainJson.verified) {
      status = "Pending Verification";
      const verificationJson = await verifyDomainWithRetry(domain);

      if (verificationJson?.verified) {
        // Re-check config after Vercel ownership verification succeeds
        const freshConfig = await getConfigResponse(domain);
        if (freshConfig?.conflicts?.length) {
          status = "Conflicting DNS Records";
        } else if (freshConfig?.misconfigured) {
          status = "Invalid Configuration";
          await prisma.domain.update({
            where: { slug: domain },
            data: { verified: false, lastChecked: new Date() },
          });
        } else {
          status = "Valid Configuration";
          await prisma.domain.update({
            where: { slug: domain },
            data: { verified: true, lastChecked: new Date() },
          });
        }

        const domainConnect: DomainConnectDiscovery | null =
          await discoverDomainConnectIfEligible(apex, status);

        return NextResponse.json({
          status,
          response: {
            configJson: freshConfig,
            domainJson: { ...domainJson, verified: true },
            verificationJson,
          },
          domainConnect,
        });
      }

      const domainConnect: DomainConnectDiscovery | null =
        await discoverDomainConnectIfEligible(apex, status);

      return NextResponse.json({
        status,
        response: { configJson, domainJson, verificationJson },
        domainConnect,
      });
    }

    let prismaResponse: any = null;
    let domainConnect: DomainConnectDiscovery | null = null;
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
      [prismaResponse, domainConnect] = await Promise.all([
        prisma.domain.update({
          where: { slug: domain },
          data: { verified: false, lastChecked: new Date() },
        }),
        discoverDomainConnectIfEligible(apex, "Invalid Configuration"),
      ]);
    }

    return NextResponse.json({
      status,
      response: { configJson, domainJson, prismaResponse },
      domainConnect,
    });
  },
  {
    requiredPermissions: ["domains.read"],
  },
);
