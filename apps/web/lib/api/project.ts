import { deleteDomainAndLinks } from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import { cancelSubscription } from "@/lib/stripe";
import cloudinary from "cloudinary";
import { ProjectProps } from "../types";

export async function deleteProject(
  project: Pick<ProjectProps, "id" | "slug" | "stripeId" | "logo">,
) {
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

  return {
    deleteProjectResponse,
    deleteDomainsResponse,
  };
}
