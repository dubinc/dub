import { prisma } from "@/lib/prisma";
import {
  getMarketplaceAllHref,
  getMarketplaceCategoryHref,
} from "@/ui/program-marketplace/utils/urls";
import { isAppHostname, PARTNERS_HOSTNAMES, SHORT_DOMAIN } from "@dub/utils";
import { Category, Prisma, WorkspaceEnvironment } from "@prisma/client";
import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  let domain = headersList.get("host") as string;

  if (domain === "dub.localhost:8888") {
    // for local development and preview URLs
    domain = SHORT_DOMAIN;
  }

  if (PARTNERS_HOSTNAMES.has(domain)) {
    const programs = await prisma.program.findMany({
      where: {
        workspace: {
          environment: WorkspaceEnvironment.production,
        },
        groups: {
          some: {
            slug: "default",
            landerData: {
              not: Prisma.AnyNull,
            },
            landerPublishedAt: {
              not: null,
            },
          },
        },
      },
      orderBy: {
        slug: "asc",
      },
    });

    return programs.map((program) => ({
      url: `https://partners.dub.co/${program.slug}`,
      lastModified: new Date(),
    }));
  }

  const entries: MetadataRoute.Sitemap = [
    {
      url: `https://${domain}`,
      lastModified: new Date(),
    },
  ];

  if (isAppHostname(domain)) {
    const marketplacePrograms = await prisma.program.findMany({
      where: {
        addedToMarketplaceAt: {
          not: null,
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        slug: "asc",
      },
    });

    entries.push(
      {
        url: "https://dub.co/marketplace",
        lastModified: new Date(),
      },
      {
        url: `https://dub.co${getMarketplaceAllHref()}`,
        lastModified: new Date(),
      },
      ...Object.values(Category).map((category) => ({
        url: `https://dub.co${getMarketplaceCategoryHref(category)}`,
        lastModified: new Date(),
      })),
      ...marketplacePrograms.map((program) => ({
        url: `https://dub.co/marketplace/${program.slug}`,
        lastModified: program.updatedAt,
      })),
    );
  }

  return entries;
}
