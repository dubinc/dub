import { NextApiRequest, NextApiResponse } from "next";
import jackson from "#/lib/jackson";
import prisma from "#/lib/prisma";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method === "POST") {
    const { apiController } = await jackson();

    const { slug } = JSON.parse(req.body) as { slug: string };

    if (!slug) {
      return res.status(400).json({ error: "No project slug provided." });
    }

    const project = await prisma.project.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!project) {
      return res.status(404).json({ error: "Project not found." });
    }

    const connections = await apiController.getConnections({
      tenant: project.id,
      product: "Dub",
    });

    if (!connections || connections.length === 0) {
      return res
        .status(404)
        .json({ error: "No SSO connections found for this project." });
    }

    const data = {
      projectId: project.id,
    };

    return res.status(200).json({ data });
  } else {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: { message: `Method ${req.method} Not Allowed` },
    });
  }
}
