import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";

export default withProjectAuth(
  async (req, res, project) => {
    // GET /api/projects/[slug]/users – get users for a specific project
    if (req.method === "GET") {
      const users = await prisma.projectUsers.findMany({
        where: {
          projectId: project.id,
        },
        select: {
          role: true,
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
          role: u.role,
        })),
      );
    } else if (req.method === "PUT") {
      const { userId, role } = req.body as {
        userId?: string;
        role?: "owner" | "member";
      };
      if (!userId || !role) {
        return res.status(400).end("Missing userId or role");
      }
      const response = await prisma.projectUsers.update({
        where: {
          userId_projectId: {
            projectId: project.id,
            userId,
          },
        },
        data: {
          role,
        },
      });

      return res.status(200).json(response);
    } else if (req.method === "DELETE") {
      // DELETE /api/projects/[slug]/users – remove a user from a project
      const { userId } = req.query as { userId?: string };
      if (!userId) {
        return res.status(400).end("Missing userId");
      }

      const projectUser = await prisma.projectUsers.findUnique({
        where: {
          userId_projectId: {
            projectId: project.id,
            userId,
          },
        },
        select: {
          role: true,
        },
      });

      if (projectUser?.role === "owner") {
        return res
          .status(400)
          .end(
            "Cannot remove owner from project. Please transfer ownership to another user first.",
          );
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
      res.setHeader("Allow", ["GET", "PUT", "DELETE"]);
      return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  },
  {
    requiredRole: ["owner"],
    excludeGet: true,
  },
);
