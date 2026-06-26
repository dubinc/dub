import { prisma } from "@/lib/prisma";
import { Category } from "@prisma/client";

export const revalidate = 3600;

export async function generateStaticParams() {
  const programs = await prisma.program.findMany({
    where: {
      addedToMarketplaceAt: {
        not: null,
      },
    },
    select: {
      slug: true,
    },
  });

  const categoryPages = Object.values(Category).map((category) => ({
    segments: ["c", category.toLowerCase()],
  }));

  const programPages = programs.map((program) => ({
    segments: [program.slug],
  }));

  return [
    { segments: [] },
    { segments: ["all"] },
    ...categoryPages,
    ...programPages,
  ];
}
