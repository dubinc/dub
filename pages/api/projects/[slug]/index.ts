import { withProjectAuth } from "#/lib/auth";
import { deleteDomainAndLinks } from "#/lib/api/domains";
import prisma from "#/lib/prisma";
import { cancelSubscription } from "#/lib/stripe";
import cloudinary from "cloudinary";
import { deleteProject } from "#/lib/api/project";

export default withProjectAuth(
  async (req, res, project, session) => {
    // GET /api/projects/[slug] – get a specific project
    if (req.method === "GET") {
      return res.status(200).json(project);

      // PUT /api/projects/[slug] – edit a specific project
    } else if (req.method === "PUT") {
      const { name, slug } = req.body;
      try {
        const response = await prisma.project.update({
          where: {
            slug: project.slug,
          },
          data: {
            ...(name && { name }),
            ...(slug && { slug }),
          },
        });
        return res.status(200).json(response);
      } catch (error) {
        if (error.code === "P2002") {
          return res.status(422).end("Project slug already exists.");
        }
      }
      // DELETE /api/projects/[slug] – delete a project
    } else if (req.method === "DELETE") {
      const response = await deleteProject(project);

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
