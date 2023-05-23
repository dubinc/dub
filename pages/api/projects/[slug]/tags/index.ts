import { withProjectAuth } from "@/lib/auth";
import prisma from "@/lib/prisma";

export default withProjectAuth(async (req, res, project) => {
  // GET /api/projects/[slug]/tags - get all tags for a project
  if (req.method === "GET") {
    const tags = await prisma.tag.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        id: true,
        name: true,
        color: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return res.status(200).json(tags);
  } else {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
