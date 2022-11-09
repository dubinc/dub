import type { NextApiRequest, NextApiResponse } from "next";
import { verifySignature } from "@upstash/qstash/nextjs";
import { handleDomainUpdates } from "@/lib/cron/domains";
import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "@/lib/domains";
import prisma from "@/lib/prisma";

/**
 * Cron to check if domains are verified.
 * Runs every 3 hours
 * TODO: If a domain is invalid for more than 7 days, we send an email to the project owner.
 * If a domain is invalid for more than 30 days, we delete it and the associating project from the database.
 **/

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const projects = await prisma.project.findMany({
      select: {
        slug: true,
        domain: true,
        domainVerified: true,
        createdAt: true,
        sentEmails: true,
      },
      orderBy: {
        domainLastChecked: "asc",
      },
      take: 100,
    });

    const results = await Promise.all(
      projects.map(async (project) => {
        const { domain, domainVerified, createdAt } = project;
        const [domainJson, configJson] = await Promise.all([
          getDomainResponse(domain),
          getConfigResponse(domain),
        ]);

        let newDomainVerified;

        if (domainJson?.error?.code === "not_found") {
          newDomainVerified = false;
        } else if (!domainJson.verified) {
          const verificationJson = await verifyDomain(domain);
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

        const prismaResponse = await prisma.project.update({
          where: {
            domain,
          },
          data: {
            domainVerified: newDomainVerified,
            domainLastChecked: new Date(),
          },
        });

        const changed = newDomainVerified !== domainVerified;

        const updates = await handleDomainUpdates(
          project.slug,
          domain,
          createdAt,
          newDomainVerified,
          changed,
          project.sentEmails.map((email) => email.type),
        );

        return {
          domain,
          previousStatus: domainVerified,
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
export default verifySignature(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
