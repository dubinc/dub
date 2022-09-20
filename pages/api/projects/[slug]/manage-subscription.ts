import { NextApiRequest, NextApiResponse } from "next";
import { withProjectAuth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { ProjectProps } from "@/lib/types";

export default withProjectAuth(
  async (req: NextApiRequest, res: NextApiResponse, project: ProjectProps) => {
    // POST /api/projects/[slug]/upgrade – upgrade a project
    if (req.method === "POST") {
      const { slug } = req.query as { slug: string };
      const { url } = await stripe.billingPortal.sessions.create({
        customer: project.stripeId,
        return_url: `${
          process.env.VERCEL === "1"
            ? "https://app.dub.sh"
            : "http://app.localhost:3000"
        }/${slug}/settings`,
      });
      return res.status(200).json(url);
    } else {
      res.setHeader("Allow", ["POST"]);
      return res
        .status(405)
        .json({ error: `Method ${req.method} Not Allowed` });
    }
  }
);
