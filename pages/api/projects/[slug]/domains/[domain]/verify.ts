import { withProjectAuth } from "@/lib/auth";
import { NextApiRequest, NextApiResponse } from "next";
import { DomainVerificationStatusProps } from "@/lib/types";
import prisma from "@/lib/prisma";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "GET") {
      const { slug, domain } = req.query as { slug: string; domain: string };
      let status: DomainVerificationStatusProps = "Valid Configuration";

      const [domainResponse, configResponse] = await Promise.all([
        fetch(
          `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}?teamId=${process.env.VERCEL_TEAM_ID}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        ),
        fetch(
          `https://api.vercel.com/v6/domains/${domain}/config?teamId=${process.env.VERCEL_TEAM_ID}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        ),
      ]);

      const domainJson = await domainResponse.json();
      const configJson = await configResponse.json();
      if (domainResponse.status !== 200) {
        // domain not found on Vercel project
        status = "Domain Not Found";
        return res
          .status(200)
          .json({ status, response: { configJson, domainJson } });
      }

      /**
       * If domain is not verified, we try to verify now
       */
      let verificationResponse = null;
      if (!domainJson.verified) {
        status = "Pending Verification";
        const verificationRes = await fetch(
          `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}/verify?teamId=${process.env.VERCEL_TEAM_ID}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        verificationResponse = await verificationRes.json();

        if (verificationResponse && verificationResponse.verified) {
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
            verificationResponse,
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
  }
);
