import {
  getMarketplaceAllHref,
  getMarketplaceCanonicalUrl,
  getMarketplaceCategoryHref,
  getMarketplaceHref,
  getMarketplaceProgramHref,
} from "@/ui/program-marketplace/utils/urls";
import { prisma } from "@dub/prisma";
import { Category, Prisma } from "@dub/prisma/client";
import { PARTNERS_HOSTNAMES, SHORT_DOMAIN } from "@dub/utils";
import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = await headers();
  let domain = headersList.get("host") as string;

  if (domain === "dub.localhost:8888" || domain.endsWith(".vercel.app")) {
    // for local development and preview URLs
    domain = SHORT_DOMAIN;
  }

  if (PARTNERS_HOSTNAMES.has(domain)) {
    const programs = await prisma.program.findMany({
      where: {
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

  if (
    process.env.NEXT_PUBLIC_APP_DOMAIN &&
    domain === process.env.NEXT_PUBLIC_APP_DOMAIN
  ) {
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
        url: getMarketplaceCanonicalUrl(getMarketplaceHref()),
        lastModified: new Date(),
      },
      {
        url: getMarketplaceCanonicalUrl(getMarketplaceAllHref()),
        lastModified: new Date(),
      },
      ...Object.values(Category).map((category) => ({
        url: getMarketplaceCanonicalUrl(getMarketplaceCategoryHref(category)),
        lastModified: new Date(),
      })),
      ...marketplacePrograms.map((program) => ({
        url: getMarketplaceCanonicalUrl(
          getMarketplaceProgramHref(program.slug),
        ),
        lastModified: program.updatedAt,
      })),
    );
  }

  return entries;
}
