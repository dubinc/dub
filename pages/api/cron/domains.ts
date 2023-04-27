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
 * TODO: If a domain is invalid for more than 7 days, we send an email to the project owner.
 * If a domain is invalid for more than 30 days, we delete it and the associating project from the database.
 **/

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const domains = await prisma.domain.findMany({
      select: {
        slug: true,
        verified: true,
        createdAt: true,
        projectId: true,
        project: {
          select: {
            createdAt: true,
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
        const { slug, verified, createdAt, projectId } = domain;
        const [domainJson, configJson] = await Promise.all([
          getDomainResponse(slug),
          getConfigResponse(slug),
        ]);

        let newDomainVerified;

        if (domainJson?.error?.code === "not_found") {
          newDomainVerified = false;
        } else if (!domainJson.verified) {
          const verificationJson = await verifyDomain(slug);
          if (verificationJson && verificationJson.verified) {
            newDomainVerified = true;
          } else {
            newDomainVerified = false;
          }
        } else if (!configJson.misconfigured) {
          newDomainVerified = true;
        } else {
          newDomainVerified = false;
        }

        const prismaResponse = await prisma.domain.update({
          where: {
            slug,
          },
          data: {
            verified: newDomainVerified,
            lastChecked: new Date(),
          },
        });

        const changed = newDomainVerified !== verified;

        const updates = await handleDomainUpdates(
          slug,
          createdAt,
          newDomainVerified,
          changed,
        );

        return {
          domain,
          previousStatus: verified,
          currentStatus: newDomainVerified,
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
