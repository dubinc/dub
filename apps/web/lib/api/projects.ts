import { deleteDomainAndLinks } from "@/lib/api/domains";
import prisma from "@/lib/prisma";
import { cancelSubscription } from "@/lib/stripe";
import cloudinary from "cloudinary";
import { ProjectProps } from "../types";
import { DUB_DOMAINS } from "@dub/utils";
import { redis } from "../upstash";

export async function deleteProject(
  project: Pick<ProjectProps, "id" | "slug" | "stripeId" | "logo">,
) {
  const [customDomains, defaultDomainLinks] = await Promise.all([
    prisma.domain.findMany({
      where: {
        projectId: project.id,
      },
      select: {
        slug: true,
      },
    }),
    prisma.link.findMany({
      where: {
        projectId: project.id,
        domain: {
          in: DUB_DOMAINS.map((domain) => domain.slug),
        },
      },
      select: {
        domain: true,
        key: true,
        proxy: true,
      },
    }),
  ]);

  const pipeline = redis.pipeline();
  defaultDomainLinks.forEach(({ domain, key }) => {
    pipeline.del(`${domain}:${key}`);
  });

  // delete all domains, links, and uploaded images associated with the project
  const deleteDomainsLinksResponse = await Promise.allSettled([
    ...customDomains.map(({ slug }) =>
      deleteDomainAndLinks(slug, {
        // here, we don't need to delete in prisma because we're deleting the project later and have onDelete: CASCADE set
        skipPrismaDelete: true,
      }),
    ),
    pipeline.exec(), // delete all default domain links from redis
    // remove all images from cloudinary
    ...defaultDomainLinks.map(({ domain, key, proxy }) =>
      proxy
        ? cloudinary.v2.uploader.destroy(`${domain}/${key}`, {
            invalidate: true,
          })
        : Promise.resolve(),
    ),
  ]);

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
    deleteDomainsLinksResponse,
    deleteProjectResponse,
  };
}
