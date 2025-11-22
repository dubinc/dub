import { prisma } from "@dub/prisma";
import { Prisma } from "@dub/prisma/client";
import { cache } from "react";

export type PublicProgram = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  wordmark: string | null;
  brandColor: string | null;
  url: string | null;
  domain: string | null;
};

export const getPublicPrograms = cache(async (): Promise<PublicProgram[]> => {
  try {
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
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        wordmark: true,
        brandColor: true,
        url: true,
        domain: true,
      },
      orderBy: {
        slug: "asc",
      },
    });

    return programs;
  } catch (error) {
    // Log error server-side without exposing sensitive details
    console.error(
      "Failed to fetch public programs:",
      error instanceof Error ? error.message : "Unknown database error",
    );
    // Return empty array as safe fallback to prevent page crash
    return [];
  }
});

