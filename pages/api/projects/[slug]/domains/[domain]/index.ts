import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/lib/prisma";
import { withProjectAuth } from "@/lib/auth";
import { changeDomain } from "@/lib/upstash";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    if (req.method === "PUT") {
      const { slug, domain } = req.query as { slug: string; domain: string }; // slug is the domain
      const newDomain = req.body;

      const domainError = newDomain.includes(" ")
        ? "Domain cannot contain spaces"
        : null;
      if (domainError) {
        return res.status(422).json({
          domainError,
        });
      }

      if (domain !== newDomain) {
        // make sure domain doesn't exist
        const project = await prisma.project.findUnique({
          where: {
            domain: newDomain,
          },
          select: { slug: true },
        });
        if (project && project.slug !== slug) {
          return res.status(400).json({ error: "Domain already exists" });
        }
        const [removeResponse, addResponse, upstashResponse, prismaResponse] =
          await Promise.all([
            fetch(
              `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains/${domain}?teamId=${process.env.VERCEL_TEAM_ID}`,
              {
                headers: {
                  Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
                },
                method: "DELETE",
              }
            ),
            fetch(
              `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains?teamId=${process.env.VERCEL_TEAM_ID}`,
              {
                body: `{\n  "name": "${newDomain}"\n}`,
                headers: {
                  Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
                  "Content-Type": "application/json",
                },
                method: "POST",
              }
            ),
            changeDomain(domain, newDomain),
            prisma.project.update({
              where: {
                slug,
              },
              data: {
                domain: newDomain,
                domainVerified: false,
              },
            }),
          ]);

        return res.status(200).json({
          removeResponse,
          addResponse,
          upstashResponse,
          prismaResponse,
        });
      }
      return res.status(200).json({ message: "Domains are the same" });
    } else {
      res.setHeader("Allow", ["PUT"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
