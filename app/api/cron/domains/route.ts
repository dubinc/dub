import { NextResponse } from "next/server";
import { receiver } from "#/lib/cron";
import { handleDomainUpdates } from "./utils";
import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "#/lib/api/domains";
import prisma from "#/lib/prisma";
import { log } from "#/lib/utils";

/**
 * Cron to check if domains are verified.
 * If a domain is invalid for more than 14 days, we send a reminder email to the project owner.
 * If a domain is invalid for more than 28 days, we send a second and final reminder email to the project owner.
 * If a domain is invalid for more than 30 days, we delete it from the database.
 **/
// Runs every 3 hours (0 */3 * * *)

export async function POST(req: Request) {
  const body = await req.json();
  if (process.env.VERCEL === "1") {
    const isValid = await receiver.verify({
      signature: req.headers.get("Upstash-Signature") || "",
      body: JSON.stringify(body),
    });
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const domains = await prisma.domain.findMany({
      where: {
        slug: {
          // exclude domains that belong to us
          notIn: [
            "dub.sh",
            "stey.me",
            "steven.yt",
            "vercel.fyi",
            "vercel.link",
            "owd.li",
            "chatg.pt",
            "elegance.ai",
          ],
        },
      },
      select: {
        slug: true,
        verified: true,
        createdAt: true,
        projectId: true,
        _count: {
          select: {
            links: true,
          },
        },
      },
      orderBy: {
        lastChecked: "asc",
      },
      take: 100,
    });

    const results = await Promise.allSettled(
      domains.map(async (domain) => {
        const { slug, verified, createdAt, _count } = domain;
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
          changed,
          linksCount: _count.links,
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
      type: "cron",
      mention: true,
    });
    return NextResponse.json({ error: error.message });
  }
}
