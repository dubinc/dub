import type { NextApiRequest, NextApiResponse } from "next";
import { verifySignature } from "@upstash/qstash/nextjs";
import prisma from "@/lib/prisma";
import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "@/lib/domains";

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const projects = await prisma.project.findMany({
        select: {
            domain: true,
            domainVerified: true,
            createdAt: true,
        },
        orderBy: {
            domainLastChecked: "desc",
        },
        where: {
            domainLastChecked: {
                lte: new Date(new Date().getTime() - 1000 * 60 * 60 * 6), // 7 days ago
            },
        },
        take: 500,
    })
    const statusChanges = await Promise.all(projects.map(async (project) => {
        const { domain, domainVerified, createdAt } = project;
        const [domainJson, configJson] = await Promise.all([
            getDomainResponse(domain),
            getConfigResponse(domain),
        ]);
        let newDomainVerified;
        if (domainJson?.error) {
            newDomainVerified = false
            return {
                domain,
                status: newDomainVerified,
                changed: newDomainVerified !== domainVerified, 
            };
        } else if (!domainJson.verified) {
            const verificationJson = await verifyDomain(domain);
            if (!configJson.misconfigured) {

    }))
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * verifySignature will try to load `QSTASH_CURRENT_SIGNING_KEY` and `QSTASH_NEXT_SIGNING_KEY` from the environment.

 * To test out the endpoint manually (wihtout using QStash), you can do `export default handler` instead and
 * hit this endpoint via http://localhost:3000/api/cron
 */
export default verifySignature(handler);

export const config = {
  api: {
    bodyParser: false,
  },
};
