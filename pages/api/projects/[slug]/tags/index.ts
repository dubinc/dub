import { withProjectAuth } from "@/lib/auth";
import { removeDomainFromVercel, deleteDomainLinks } from "@/lib/api/domains";
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

    // PUT /api/projects/[slug]/tags – create a new tag for a project
  } else if (req.method === "POST") {
  } else {
    res.setHeader("Allow", ["GET", "POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
