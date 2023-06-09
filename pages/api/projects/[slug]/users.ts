import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";

export default withProjectAuth(async (req, res, project) => {
  // GET /api/projects/[slug]/users – get users for a specific project
  if (req.method === "GET") {
    const users = await prisma.projectUsers.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
        createdAt: true,
      },
    });
    return res.status(200).json(
      users.map((u) => ({
        ...u.user,
        joinedAt: u.createdAt,
      })),
    );
  } else if (req.method === "DELETE") {
    // DELETE /api/projects/[slug]/users – remove a user from a project
    const { userId } = req.query as { userId?: string };
    if (!userId) {
      return res.status(400).end("Missing userId");
    }
    const response = await prisma.projectUsers.delete({
      where: {
        userId_projectId: {
          projectId: project.id,
          userId,
        },
      },
    });
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
