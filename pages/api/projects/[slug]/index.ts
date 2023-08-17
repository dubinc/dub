import { withProjectAuth } from "#/lib/auth";
import { deleteDomainAndLinks } from "#/lib/api/domains";
import prisma from "#/lib/prisma";
import { cancelSubscription } from "#/lib/stripe";
import cloudinary from "cloudinary";

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
      const domains = (
        await prisma.domain.findMany({
          where: {
            projectId: project.id,
          },
          select: {
            slug: true,
          },
        })
      ).map((domain) => domain.slug);

      // delete all domains, links, and uploaded images associated with the project
      const deleteDomainsResponse = await Promise.allSettled(
        domains.map((domain) =>
          deleteDomainAndLinks(domain, {
            // here, we don't need to delete in prisma because we're deleting the project later and have onDelete: CASCADE set
            skipPrismaDelete: true,
          }),
        ),
      );

      const deleteProjectResponse = await Promise.all([
        // delete project logo from Cloudinary
        project.logo &&
          cloudinary.v2.uploader.destroy(`logos/${project.id}`, {
            invalidate: true,
          }),
        // if they have a Stripe subscription, cancel it
        project.stripeId && cancelSubscription(project.stripeId),
        // delete the project
        prisma.project.delete({
          where: {
            slug: project.slug,
          },
        }),
      ]);

      return res.status(200).json({
        deleteProjectResponse,
        deleteDomainsResponse,
      });
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
