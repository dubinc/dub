import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { redis } from "@/lib/upstash";
import { RootDomainProps } from "@/lib/types";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse) => {
    const { domain } = req.query as { domain: string };

    // GET /api/projects/[slug]/domains/[domain]/root - get root domain
    if (req.method === "GET") {
      const { target } =
        (await redis.get<RootDomainProps>(`root:${domain}`)) || {};
      return res.status(200).json(target);

      // PUT /api/projects/[slug]/domains/[domain]/root - change root domain
    } else if (req.method === "PUT") {
      const { rootDomain } = req.body as { rootDomain: string };
      const response = await redis.set(`root:${domain}`, {
        target: rootDomain,
        rewrite: false,
      });
      res.status(200).json(response);
    } else {
      res.setHeader("Allow", ["GET", "PUT"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  },
  {
    excludeGet: true,
    needNotExceededUsage: true,
    needProSubscription: true,
  },
);
