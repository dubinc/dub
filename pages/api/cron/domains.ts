import type { NextApiRequest, NextApiResponse } from "next";
import { verifySignature } from "@upstash/qstash/nextjs";
import { handleDomainUpdates } from "@/lib/cron/domains";
import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "@/lib/api/domains";
import prisma from "@/lib/prisma";

/**
 * Cron to check if domains are verified.
 * Runs every 3 hours
 * If a domain is invalid for more than 14 days, we send a reminder email to the project owner.
 * If a domain is invalid for more than 28 days, we send a second and final reminder email to the project owner.
 * If a domain is invalid for more than 30 days, we delete it from the database.
 **/

async function handler(_req: NextApiRequest, res: NextApiResponse) {
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
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * verifySignature will try to load `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` from the environment.

 * To test out the endpoint manually (wihtout using QStash), you can do `export default handler` instead and
 * hit this endpoint via http://localhost:3000/api/cron/domains
 */
const Cron = () => {
  if (process.env.NODE_ENV === "development") {
    return handler;
  } else {
    return verifySignature(handler);
  }
};

export default Cron();

export const config = {
  api: {
    bodyParser: false,
  },
};
