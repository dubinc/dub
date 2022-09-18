import { NextApiRequest, NextApiResponse } from "next";
import { getSession } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession(req, res);
  if (!session?.user.id) return res.status(401).end("Unauthorized");

  // GET /api/projects – get all projects associated with the authenticated user
  if (req.method === "GET") {
    const response = await prisma.project.findMany({
      where: {
        users: {
          some: {
            userId: session.user.id,
          },
        },
      },
    });
    return res.status(200).json(response);

    // POST /api/projects – create a new project
  } else if (req.method === "POST") {
    const { name, slug, domain } = req.body;
    if (!name || !slug || !domain) {
      return res.status(400).json({ error: "Missing name or slug or domain" });
    }

    try {
      const project = await prisma.project.create({
        data: {
          name,
          slug,
          domain,
          users: {
            create: {
              userId: session.user.id,
              role: "owner",
            },
          },
        },
      });
      if (project) {
        const [domainResponse, stripeResponse] = await Promise.all([
          fetch(
            `https://api.vercel.com/v9/projects/${process.env.VERCEL_PROJECT_ID}/domains?teamId=${process.env.VERCEL_TEAM_ID}`,
            {
              body: `{\n  "name": "${project.domain}"\n}`,
              headers: {
                Authorization: `Bearer ${process.env.AUTH_BEARER_TOKEN}`,
                "Content-Type": "application/json",
              },
              method: "POST",
            }
          ).then((res) => res.json()),
          stripe.customers.create({
            name,
            email: session.user.email,
          }),
        ]);
        console.log(stripeResponse);
        await prisma.project.update({
          where: {
            id: project.id,
          },
          data: {
            stripeId: stripeResponse.id,
          },
        });
        return res.status(200).json({ project, domain: domainResponse });
      }
      return res.status(400).json({ error: "Project not created" });
    } catch (error: any) {
      if (error.code === "P2002") {
        return res.status(400).json({ error: "Project slug already exists" });
      }
    }
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
}
