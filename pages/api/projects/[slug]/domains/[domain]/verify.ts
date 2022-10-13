import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import {
  getConfigResponse,
  getDomainResponse,
  verifyDomain,
} from "@/lib/domains";
import prisma from "@/lib/prisma";
import { DomainVerificationStatusProps } from "@/lib/types";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    // GET /api/projects/[slug]/domains/[domain]/verify - get domain verification status
    if (req.method === "GET") {
      const { slug, domain } = req.query as { slug: string; domain: string };
      let status: DomainVerificationStatusProps = "Valid Configuration";

      const [domainJson, configJson] = await Promise.all([
        getDomainResponse(domain),
        getConfigResponse(domain),
      ]);

      if (domainJson?.error?.code === "not_found") {
        // domain not found on Vercel project
        status = "Domain Not Found";
        return res
          .status(200)
          .json({ status, response: { configJson, domainJson } });
      } else if (domainJson.error) {
        status = "Unknown Error";
        return res
          .status(200)
          .json({ status, response: { configJson, domainJson } });
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

        return res.status(200).json({
          status,
          response: {
            configJson,
            domainJson,
            verificationJson,
          },
        });
      }

      let prismaResponse = null;
      if (!configJson.misconfigured) {
        prismaResponse = await prisma.project.update({
          where: {
            slug,
          },
          data: {
            domainVerified: true,
            domainLastChecked: new Date(),
          },
        });
      } else {
        status = "Invalid Configuration";
        prismaResponse = await prisma.project.update({
          where: {
            slug,
          },
          data: {
            domainVerified: false,
            domainLastChecked: new Date(),
          },
        });
      }

      return res.status(200).json({
        status,
        response: { configJson, domainJson, prismaResponse },
      });
    } else {
      res.setHeader("Allow", ["GET"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
);
