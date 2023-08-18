import { inviteUser } from "#/lib/api/users";
import { withProjectAuth } from "#/lib/auth";
import prisma from "#/lib/prisma";

export default withProjectAuth(async (req, res, project, session) => {
  // GET /api/projects/[slug]/invites - Get all pending invites for a project
  if (req.method === "GET") {
    const invites = await prisma.projectInvite.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        email: true,
        createdAt: true,
      },
    });
    return res.status(200).json(invites);

    // POST /api/projects/[slug]/invites – invite a teammate
  } else if (req.method === "POST") {
    const { email } = req.body;

    const alreadyInTeam = await prisma.projectUsers.findFirst({
      where: {
        projectId: project.id,
        user: {
          email,
        },
      },
    });
    if (alreadyInTeam) {
      return res.status(400).end("User already exists in this project.");
    }

    if (project.plan === "free") {
      const users = await prisma.projectUsers.count({
        where: {
          projectId: project.id,
        },
      });
      const invites = await prisma.projectInvite.count({
        where: {
          projectId: project.id,
        },
      });
      if (users + invites >= 3) {
        return res
          .status(400)
          .end("You've reached the maximum number of users for the free plan.");
      }
    }

    try {
      await inviteUser({
        email,
        project,
        session,
      });
      return res.status(200).json({ message: "Invite sent" });
    } catch (error) {
      return res.status(400).end(error);
    }

    // DELETE /api/projects/[slug]/invites – delete a pending invite
  } else if (req.method === "DELETE") {
    const { email } = req.query as { email?: string };
    if (!email) {
      return res.status(400).end("Missing email");
    }
    const response = await prisma.projectInvite.delete({
      where: {
        email_projectId: {
          email,
          projectId: project.id,
        },
      },
    });
    return res.status(200).json(response);
  } else {
    res.setHeader("Allow", ["GET", "POST", "DELETE"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
});
