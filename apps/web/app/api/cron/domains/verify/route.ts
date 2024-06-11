import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "@/lib/api/domains";
import { handleAndReturnErrorResponse } from "@/lib/api/errors";
import { verifyVercelSignature } from "@/lib/cron/verify-vercel";
import { prisma } from "@/lib/prisma";
import { log } from "@dub/utils";
import { NextResponse } from "next/server";
import { handleDomainUpdates } from "./utils";

/**
 * Cron to check if domains are verified.
 * If a domain is invalid for more than 14 days, we send a reminder email to the workspace owner.
 * If a domain is invalid for more than 28 days, we send a second and final reminder email to the workspace owner.
 * If a domain is invalid for more than 30 days, we delete it from the database.
 **/
// Runs every hour (0 * * * *)

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    await verifyVercelSignature(req);

    const result = await prisma.domain.findMany({
      where: {
        slug: {
          // exclude domains that belong to us
          notIn: [
            "dub.sh",
            "chatg.pt",
            "amzn.id",
            "spti.fi",
            "stey.me",
            "steven.yt",
            "steven.blue",
            "owd.li",
            "elegance.ai",
          ],
        },
      },
      select: {
        slug: true,
        verified: true,
        primary: true,
        createdAt: true,
        projectId: true,
        _count: {
          select: {
            links: true,
          },
        },
        links: {
          select: {
            clicks: true,
          },
        },
      },
      orderBy: {
        lastChecked: "asc",
      },
      take: 30,
    });

    const domains = result.map((domain) => {
      return {
        ...domain,
        clicks: domain.links[0].clicks,
      };
    });

    const results = await Promise.allSettled(
      domains.map(async (domain) => {
        const { slug, verified, primary, createdAt, _count } = domain;
        const [domainJson, configJson] = await Promise.all([
          getDomainResponse(slug),
          getConfigResponse(slug),
        ]);

        let newVerified;

        if (domainJson?.error?.code === "not_found") {
          newVerified = false;
        } else if (!domainJson.verified) {
          const verificationJson = await verifyDomain(slug);
          if (verificationJson && verificationJson.verified) {
            newVerified = true;
          } else {
            newVerified = false;
          }
        } else if (!configJson.misconfigured) {
          newVerified = true;
        } else {
          newVerified = false;
        }

        const prismaResponse = await prisma.domain.update({
          where: {
            slug,
          },
          data: {
            verified: newVerified,
            lastChecked: new Date(),
          },
        });

        const changed = newVerified !== verified;

        const updates = await handleDomainUpdates({
          domain: slug,
          createdAt,
          verified: newVerified,
          primary,
          changed,
          clicks: domain.clicks,
          linksCount: _count.links - 1 || 0,
        });

        return {
          domain,
          previousStatus: verified,
          currentStatus: newVerified,
          changed,
          updates,
          prismaResponse,
        };
      }),
    );
    return NextResponse.json(results);
  } catch (error) {
    await log({
      message: "Domains cron failed. Error: " + error.message,
      type: "errors",
    });
    return handleAndReturnErrorResponse(error);
  }
}
