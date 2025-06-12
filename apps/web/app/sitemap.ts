import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { PARTNERS_HOSTNAMES, SHORT_DOMAIN } from "@dub/utils";
import { MetadataRoute } from "next";
import { headers } from "next/headers";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const headersList = headers();
  let domain = headersList.get("host") as string;

  if (domain === "dub.localhost:8888" || domain.endsWith(".vercel.app")) {
    // for local development and preview URLs
    domain = SHORT_DOMAIN;
  }

  if (PARTNERS_HOSTNAMES.has(domain)) {
    const programs = await prisma.program.findMany({
      where: {
        landerData: {
          not: Prisma.JsonNull,
        },
        landerPublishedAt: {
          not: null,
        },
      },
    });

    return programs.map((program) => ({
      url: `https://partners.dub.co/${program.slug}`,
      lastModified: new Date(),
    }));
  }

  return [
    {
      url: `https://${domain}`,
      lastModified: new Date(),
    },
  ];
}
